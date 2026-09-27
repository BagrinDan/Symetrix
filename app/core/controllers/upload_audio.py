import os
import shutil
import tempfile
import uuid

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.core.service import llm_service, whisper_service

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

jobs: dict[str, dict] = {}

# Куда сохраняем загруженные файлы. По умолчанию — ВНЕ репозитория (system temp),
# чтобы случайно не попасть под watcher `uvicorn --reload`, который следит за
# файлами проекта и перезапускает процесс (а вместе с ним обнуляет jobs).
# Если хотите хранить рядом с проектом — задайте MEETINGS_UPLOAD_DIR явно
# и убедитесь, что reload выключен (см. main.py).
UPLOAD_DIR = os.environ.get(
    "MEETINGS_UPLOAD_DIR",
    os.path.join(tempfile.gettempdir(), "symetrix-meetings-audio"),
)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Разрешённые расширения (то, что реально умеет читать faster_whisper/ffmpeg)
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}


def _format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def _process_upload(job_id: str, audio_path: str) -> None:
    print("Начинаем транскрибацию... (это может занять время)")
    try:
        chunks = whisper_service.transcribe_meeting(audio_path)
        transcript = " ".join(c.text for c in chunks)

        # Сегменты в формате, который ждёт фронтенд (панель Transcript):
        # { time, speaker, lang, text }. Диаризации пока нет, поэтому
        # speaker оставляем пустым, а lang берём из результата Whisper.
        segments = [
            {
                "time": _format_timestamp(c.start),
                "speaker": "",
                "lang": (c.language or "").upper(),
                "text": c.text,
            }
            for c in chunks
        ]

        print("Транскрибация успешно завершена!")

        result = {
            "status": "processing",
            "stage": "summarizing",
            "transcript": transcript,
            "segments": segments,
            "summary": "",
            "decisions": [],
            "actions": [],
        }
        jobs[job_id] = result

        # Генерация MoM (summary/decisions/action items) — best-effort.
        # Если LLM упадёт, транскрипт всё равно остаётся доступным.
        try:
            print("Генерирую summary (MoM) через LLM...")
            mom = llm_service.generate_mom(transcript)

            result["summary"] = mom["summary"]

            result["decisions"] = [
                {
                    "id": i + 1,
                    "decision": d.get("decision", ""),
                    "owner": d.get("owner", ""),
                    "status": d.get("status", ""),
                    "evidence": "",
                }
                for i, d in enumerate(mom["decisions"])
            ]

            result["actions"] = [
                {
                    "id": i + 1,
                    "task": a.get("task", ""),
                    "owner": a.get("owner", ""),
                    "deadline": a.get("deadline", ""),
                    "label": a.get("deadline", ""),
                    "priority": a.get("priority", "medium"),
                    "status": a.get("status", "Not started"),
                    "evidence": "",
                }
                for i, a in enumerate(mom["action_items"])
            ]

            result["status"] = "done"
            result["stage"] = "done"
            jobs[job_id] = result
            print("MoM успешно сгенерирован!")
        except Exception as llm_error:
            print(f"\n⚠️ Транскрипт готов, но генерация MoM не удалась: {llm_error}\n")
            result["status"] = "done"
            result["stage"] = "done"
            result["mom_error"] = str(llm_error)
            jobs[job_id] = result

    except Exception as e:
        print(f"\n❌ ПРОИЗОШЛА ОШИБКА ПРИ ОБРАБОТКЕ: {e}\n")
        jobs[job_id] = {"status": "error", "stage": "error", "detail": str(e)}


@router.post("/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> dict:
    """
    Принимает аудиофайл от фронтенда, сохраняет его на диск
    и запускает транскрибацию в фоне. Сразу возвращает job_id,
    по которому можно опрашивать статус через /status/{job_id}.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат файла: {ext or 'неизвестно'}",
        )

    job_id = uuid.uuid4().hex
    audio_path = os.path.join(UPLOAD_DIR, f"{job_id}{ext}")

    try:
        with open(audio_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
    finally:
        await file.close()

    jobs[job_id] = {"status": "processing", "stage": "transcribing"}
    background_tasks.add_task(_process_upload, job_id, audio_path)

    return {"job_id": job_id, "status": "processing"}


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> dict:
    """Возвращает текущий статус задачи (processing / done / error) и результат, если готов."""
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Задача с таким job_id не найдена")
    return job