# Symetrix

DeepTech GigaHack


Main idea:
    TODO


Arhitecture:
    Main pipeline:
    - Audio -> VAD -> Whisper -> LLM -> MoM
    
    Detailed:
    - TODO
    

How to run it:
    Install python env:
    1. pyenv 3.11.10 
    2. python -m venv .venv
    3. TODO (for linux)
    4. TODO (for windows)

    Install models:

    1. hf download Qwen/Qwen3-ASR-1.7B-hf --local-dir models/Qwen3-ASR-1.7B-hf

    2. hf download bartowski/Qwen2.5-7B-Instruct-GGUF \
    --include "Qwen2.5-7B-Instruct-Q4_K_M.gguf" \
    --local-dir ./models/Qwen2.5-7b-instruct

    Run app:
    - TODO