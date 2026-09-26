import torch
from typing import Optional
from transformers import AutoProcessor, AutoModel, Qwen3ASRForConditionalGeneration

# Оставляем удобные утилиты для аудио из faster_whisper
from faster_whisper.audio import decode_audio
from faster_whisper.vad import get_speech_timestamps, VadOptions

from app.core.dto.speech_window import SpeechWindow
from app.core.dto.transcripted_text import TranscribedChunk




ALLOWED_LANGUAGES = {"ro"}
SAMPLE_RATE = 16_000

# ---------------------------------------------------------------------------
# Реестр моделей
# ---------------------------------------------------------------------------
class ModelRegistry:
    processor: Optional[AutoProcessor] = None
    model: Optional[AutoModel] = None

registry = ModelRegistry()
def load_models(
    model_path: str = "models/Qwen3-ASR-0.6B-hf",
) -> None:
    # 1. Загружаем процессор
    registry.processor = AutoProcessor.from_pretrained(
        model_path, 
        local_files_only=True
    )
    
    # 2. Загружаем модель напрямую через ее родной класс, встроенный в transformers
    registry.model = Qwen3ASRForConditionalGeneration.from_pretrained(
        model_path,
        device_map="auto",
        dtype=torch.float16,
        local_files_only=True
    )
    registry.model.eval()

def unload_models() -> None:
    if registry.model is not None:
        del registry.model
    if registry.processor is not None:
        del registry.processor
    registry.model = None
    registry.processor = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ----------
# 1. VAD
# ----------
def get_speech_windows(
    audio, min_window_sec=5.0, max_window_sec=20.0, min_silence_duration_ms=300, sample_rate=SAMPLE_RATE
) -> list[SpeechWindow]:
    vad_options = VadOptions(min_silence_duration_ms=min_silence_duration_ms, speech_pad_ms=100)
    raw_chunks = get_speech_timestamps(audio, vad_options=vad_options)
    if not raw_chunks:
        return []

    min_samples = int(min_window_sec * sample_rate)
    merged: list[SpeechWindow] = []
    current_start = raw_chunks[0]["start"]
    current_end = raw_chunks[0]["end"]

    for chunk in raw_chunks[1:]:
        if current_end - current_start < min_samples:
            current_end = chunk["end"]
        else:
            merged.append(SpeechWindow(current_start, current_end))
            current_start, current_end = chunk["start"], chunk["end"]
    merged.append(SpeechWindow(current_start, current_end))

    windows: list[SpeechWindow] = []
    for w in merged:
        for piece_start, piece_end in _split_if_too_long(w.start_sample, w.end_sample, max_window_sec, sample_rate):
            windows.append(SpeechWindow(piece_start, piece_end))
    return windows


def _split_if_too_long(start: int, end: int, max_window_sec: float, sample_rate: int) -> list[tuple[int, int]]:
    max_samples = int(max_window_sec * sample_rate)
    length = end - start
    if length <= max_samples:
        return [(start, end)]
    n_pieces = -(-length // max_samples)
    piece_len = length // n_pieces
    return [(start + i * piece_len, end if i == n_pieces - 1 else start + (i + 1) * piece_len) for i in range(n_pieces)]


def transcribe_chunk(chunk_audio) -> str:
    if registry.model is None or registry.processor is None:
        raise RuntimeError("Модель не загружена — вызовите load_models() сначала")

    inputs = registry.processor.apply_transcription_request(
        audio=chunk_audio,
        sampling_rate=SAMPLE_RATE,
    ).to(registry.model.device, registry.model.dtype)

    with torch.no_grad():
        output_ids = registry.model.generate(**inputs, max_new_tokens=256)

    generated_ids = output_ids[:, inputs["input_ids"].shape[1]:]
    transcription = registry.processor.decode(
        generated_ids, return_format="transcription_only"
    )[0]
    return transcription.strip()


def process_window(chunk_audio, start_sample: int, sample_rate: int = SAMPLE_RATE) -> Optional[TranscribedChunk]:
    if len(chunk_audio) < SAMPLE_RATE * 1:
        return None

    text = transcribe_chunk(chunk_audio)
    if not text:
        return None

    return TranscribedChunk(
        start=start_sample / sample_rate,
        end=(start_sample + len(chunk_audio)) / sample_rate,
        language="auto", 
        language_probability=1.0,
        text=text,
    )


# ---------------------------------------------------------------------------
# 5. Главная функция
# ---------------------------------------------------------------------------
def transcribe_meeting(
    audio_path: str, min_window_sec: float = 5.0, max_window_sec: float = 20.0
) -> list[TranscribedChunk]:
    
    audio = decode_audio(audio_path, sampling_rate=SAMPLE_RATE)
    windows = get_speech_windows(audio, min_window_sec=min_window_sec, max_window_sec=max_window_sec)

    result: list[TranscribedChunk] = []
    for window in windows:
        chunk_audio = audio[window.start_sample : window.end_sample]
        chunk_result = process_window(chunk_audio, window.start_sample)
        if chunk_result is not None:
            result.append(chunk_result)

    return result