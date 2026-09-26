import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verdikt")

app = FastAPI(
    title="Test",
    version="1.0.0",
    description="DeepDeckGigaByte"
)

# Frontend

# Controllers
app.include_router(upload_audio.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=12000, reload=True)