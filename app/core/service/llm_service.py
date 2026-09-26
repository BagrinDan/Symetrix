
import json
import logging
from llama_cpp import Llama

import httpx

logger = logging.getLogger(__name__)

llm = Llama(model_path="./models/qwen2.5-7b-instruct-q4_k_m.gguf", n_gpu_layers=-1)

SYSTEM_PROMPT = """Ты помощник, который анализирует транскрипт встречи в больнице Medpark."""

class LLMService:
    def __init__(
        self,
        base_url: str = OLLAMA_URL,
        model: str = OLLAMA_MODEL,
        timeout: float = OLLAMA_TIMEOUT,
    ):
        self.base_url = base_url
        self.model = model
        self.timeout = timeout

    def generate_mom(self, transcript: str) -> dict:
        raw = self._call_ollama(transcript)
        mom = self._parse_json(raw)

        if mom is None:
            logger.warning("Первый ответ LLM не распарсился, повторяю с уточнением")
            raw = self._call_ollama(transcript, retry=True)
            mom = self._parse_json(raw)

        if mom is None:
            raise ValueError(f"LLM не вернула валидный JSON после ретрая: {raw!r}")

        return mom

    def unload_model(self) -> None:

        try:
            httpx.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": "", "keep_alive": 0},
                timeout=10,
            )
        except httpx.HTTPError:
            logger.warning("Не удалось явно выгрузить модель Ollama (не критично)")

    # -- внутреннее -----------------------------------------------------

    def _call_ollama(self, transcript: str, retry: bool = False) -> str:
        prompt = f"{SYSTEM_PROMPT}\n\nТранскрипт встречи:\n{transcript}"
        if retry:
            prompt += "\n\nВАЖНО: верни ТОЛЬКО валидный JSON, без markdown-разметки и пояснений."

        response = httpx.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.1},
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()["response"]

    @staticmethod
    def _parse_json(raw: str) -> dict | None:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None


llm_service = LLMService()