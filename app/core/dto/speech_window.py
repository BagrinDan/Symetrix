from dataclasses import dataclass


@dataclass
class SpeechWindow:
    start_sample: int
    end_sample: int
