import json
import logging
import os
import re
from typing import Optional

from llama_cpp import Llama

logger = logging.getLogger(__name__)

# Путь к модели, скачанной по инструкции из README:
# hf download bartowski/Qwen2.5-7B-Instruct-GGUF \
#   --include "Qwen2.5-7B-Instruct-Q4_K_M.gguf" \
#   --local-dir ./models/Qwen2.5-7b-instruct
MODEL_PATH = os.environ.get(
    "MOM_MODEL_PATH",
    "models/qwen2.5-7b-instruct/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
)

SYSTEM_PROMPT = (
    "Ești un asistent care analizează transcrierea unei întâlniri de la spitalul Medpark "
    "și pregătește procesul-verbal al întâlnirii (Minutes of Meeting).\n"
    "Răspunde STRICT în format JSON valid, fără marcaj markdown (fără ```), fără explicații "
    "în afara JSON-ului, în următorul format:\n"
    "{\n"
    '  "summary": "un rezumat scurt al întâlnirii, 3-5 propoziții",\n'
    '  "decisions": [\n'
    '    {"decision": "textul deciziei", "owner": "cine a luat-o / responsabil", "status": "Confirmed"}\n'
    "  ],\n"
    '  "action_items": [\n'
    '    {"task": "ce trebuie făcut", "owner": "responsabil", "deadline": "termenul limită, dacă este menționat", '
    '"priority": "high sau medium", "status": "Not started"}\n'
    "  ]\n"
    "}\n"
    "Dacă ceva nu poate fi determinat cu certitudine din transcriere (de exemplu, responsabilul sau termenul limită) — "
    "pune un șir gol \"\". Dacă nu au existat decizii sau sarcini — returnează liste goale."
)


class ModelRegistry:
    llm: Optional[Llama] = None


registry = ModelRegistry()


def load_model(model_path: str = MODEL_PATH, n_ctx: int = 8192) -> None:
    logger.info("Загружаю LLM для генерации MoM: %s", model_path)
    registry.llm = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=-1,
        verbose=False,
    )


def unload_model() -> None:
    registry.llm = None


def generate_mom(transcript: str) -> dict:
    """
    Принимает сырой транскрипт (текст от ASR) и возвращает словарь:
    {"summary": str, "decisions": [...], "action_items": [...]}
    """
    if registry.llm is None:
        raise RuntimeError("LLM не загружена — вызовите load_model() сначала")

    if not transcript.strip():
        return {"summary": "", "decisions": [], "action_items": []}

    raw = _call_llm(transcript)
    mom = _parse_json(raw)

    if mom is None:
        logger.warning("Первый ответ LLM не распарсился, повторяю с уточнением")
        raw = _call_llm(transcript, retry=True)
        mom = _parse_json(raw)

    if mom is None:
        raise ValueError(f"LLM не вернула валидный JSON после ретрая: {raw!r}")

    return {
        "summary": mom.get("summary") or "",
        "decisions": mom.get("decisions") or [],
        "action_items": mom.get("action_items") or [],
    }


def _call_llm(transcript: str, retry: bool = False) -> str:
    user_prompt = f"Транскрипт встречи:\n{transcript}"
    if retry:
        user_prompt += "\n\nВАЖНО: верни ТОЛЬКО валидный JSON, без markdown и пояснений."

    response = registry.llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )
    return response["choices"][0]["message"]["content"]


def _parse_json(raw: str) -> Optional[dict]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # На случай если модель всё же обернула JSON в ```json ... ``` или добавила текст вокруг
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None