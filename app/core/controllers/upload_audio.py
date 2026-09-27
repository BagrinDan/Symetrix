 
from fastapi import APIRouter
 
from app.core.service import whisper_service 


from faster_whisper.audio import decode_audio
router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

jobs: dict[str, dict] = {}


def test_process_upload(job_id: str, audio_path: str) -> None:
    try:
        pass
    except Exception as e:
        jobs[job_id] = {"status": "error", "detail": str(e)}


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


if __name__ == "__main__":
    whisper_service.load_models()

    test_job_id = "test-1"
    
    _process_upload(test_job_id, "app/audio/Medpark_audio.m4a")

    if test_job_id in jobs:
        print(f"Статус: {jobs[test_job_id]['status']}")
        if jobs[test_job_id]["status"] == "done":
            print(f"Текст:\n{jobs[test_job_id]['transcript']}")
        else:
            print(f"Детали ошибки: {jobs[test_job_id]['detail']}")
    else:
        print("Словарь jobs остался пустым. Функция полностью провалилась до блока try/except.")