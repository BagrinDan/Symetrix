from dataclasses import dataclass, field

@dataclass
class TranscribedChunk:
    start: float          
    end: float
    language: str
    language_probability: float
    text: str
