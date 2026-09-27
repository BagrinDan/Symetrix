import os
import shutil
import uuid

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.core.service import whisper_service

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

jobs: dict[str, dict] = {}

# Куда сохраняем загруженные файлы (можно переопределить через переменную окружения)
UPLOAD_DIR = os.environ.get("MEETINGS_UPLOAD_DIR", "app/audio")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Разрешённые расширения (то, что реально умеет читать faster_whisper/ffmpeg)
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}


def _process_upload(job_id: str, audio_path: str) -> None:
    print("Начинаем транскрибацию... (это может занять время)")
    try:
        chunks = whisper_service.transcribe_meeting(audio_path)
        transcript = " ".join(c.text for c in chunks)
        print("Транскрибация успешно завершена!")
        jobs[job_id] = {"status": "done", "transcript": transcript}
    except Exception as e:
        print(f"\n❌ ПРОИЗОШЛА ОШИБКА ПРИ ОБРАБОТКЕ: {e}\n")
        jobs[job_id] = {"status": "error", "detail": str(e)}


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

    jobs[job_id] = {"status": "processing"}
    background_tasks.add_task(_process_upload, job_id, audio_path)

    return {"job_id": job_id, "status": "processing"}


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> dict:
    """Возвращает текущий статус задачи (processing / done / error) и результат, если готов."""
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Задача с таким job_id не найдена")
    return job