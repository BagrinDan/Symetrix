import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.controllers import upload_audio
from app.core.service import llm_service, whisper_service

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verdikt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Загружаем модели один раз при старте приложения, чтобы запросы
    # не падали с "модель не загружена".
    # ВНИМАНИЕ: Whisper + 7B LLM одновременно в памяти/на GPU — это тяжело.
    # Если не хватает VRAM/RAM, можно грузить LLM лениво (при первом запросе)
    # вместо старта приложения.
    logger.info("Загружаю модель Whisper...")
    whisper_service.load_models()

    logger.info("Загружаю LLM для MoM...")
    llm_service.load_model()

    logger.info("Все модели загружены, сервис готов принимать запросы")

    yield

    logger.info("Выгружаю модели...")
    whisper_service.unload_models()
    llm_service.unload_model()


app = FastAPI(
    title="Test",
    version="1.0.0",
    description="DeepDeckGigaByte",
    lifespan=lifespan,
)

# Разрешаем фронтенду ходить на бэкенд (уточните origins под свой домен/порт в проде)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
async def home():
    return FileResponse("app/static/index.html")


# Frontend

# Controllers
app.include_router(upload_audio.router)

if __name__ == "__main__":
    # reload=True тут нельзя: uvicorn следит за файлами в проекте и
    # перезапускает процесс при любом изменении. Загружаемые аудиофайлы
    # пишутся в app/audio/ (внутри проекта), это тоже триггерит reload —
    # процесс перезапускается посреди обработки, jobs={} обнуляется в памяти,
    # и уже готовый результат теряется. Плюс перезагружать Whisper+LLM на
    # каждое изменение файла — само по себе очень медленно.
    uvicorn.run("app.main:app", host="127.0.0.1", port=12000, reload=False)