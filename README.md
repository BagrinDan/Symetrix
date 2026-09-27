# Symetrix

DeepTech GigaHack


Main idea:
    TODO


Arhitecture:
    Main pipeline:
    - Audio -> VAD -> Whisper -> LLM -> MoM
    

    

How to run it:
    Install python env:
    1. pyenv 3.11.10 
    2. python -m venv .venv
    3. Linux: source .venv/bin/activate (или source .venv/bin/activate.fish если используете Fish)
    4. Windows: .venv\Scripts\activate (для CMD) или .venv\Scripts\Activate.ps1 (для PowerShell)

    Install models:

    1. hf download Qwen/Qwen3-ASR-1.7B-hf --local-dir models/Qwen3-ASR-1.7B-hf

    2. hf download bartowski/Qwen2.5-7B-Instruct-GGUF \
    --include "Qwen2.5-7B-Instruct-Q4_K_M.gguf" \
    --local-dir ./models/Qwen2.5-7b-instruct

    Run app:
    - uvicorn app.main:app --reload --port 12000