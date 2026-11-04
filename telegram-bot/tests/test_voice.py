"""Голос: подготовка текста к озвучке, кодирование в формат голосовых Telegram, служба голоса.

Настоящие модели Whisper и Piper в тестах не загружаются (это сотни мегабайт) —
вместо них заглушки. Кодирование звука проверяется по-настоящему (если установлен PyAV).
"""

import io
import math
import struct
import wave

import pytest

from family_bot import voice as voice_module
from family_bot.voice import VoiceService, clean_for_speech, create_voice_service


def test_clean_for_speech():
    text = "🌙 **Сказка** про ёжика\n• раз\nhttps://x.ru/a ссылка\n\nИсточники:\n• сайт — https://y.ru"
    assert clean_for_speech(text) == "Сказка про ёжика\nраз\nссылка"


def test_long_text_is_cut_at_sentence():
    text = "Жил-был ёжик. " * 400
    cleaned = clean_for_speech(text, limit=1000)
    assert len(cleaned) <= 1000 and cleaned.endswith(".")


def test_empty_text_after_cleaning():
    assert clean_for_speech("🌙✨ https://x.ru") == ""


def make_wav(seconds: float = 1.0, rate: int = 22050) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        frames = int(seconds * rate)
        wav.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(i / 8))) for i in range(frames)))
    return buffer.getvalue()


def test_wav_to_ogg_opus_is_real_voice_format():
    av = pytest.importorskip("av")
    ogg = voice_module.wav_to_ogg_opus(make_wav(2.0))
    assert ogg[:4] == b"OggS"
    with av.open(io.BytesIO(ogg)) as container:
        stream = container.streams.audio[0]
        assert stream.codec_context.name == "opus" and stream.rate == 48000
        samples = sum(frame.samples for frame in container.decode(audio=0))
    assert samples / 48000 == pytest.approx(2.0, abs=0.05)  # длительность сохранилась


class FakeStt:
    def __init__(self):
        self.loaded = False

    def load(self):
        self.loaded = True

    def transcribe(self, audio: bytes) -> str:
        return f"распознано {len(audio)} байт"


class FakeTts:
    def __init__(self, broken=False):
        self.broken = broken
        self.texts = []

    def load(self):
        if self.broken:
            raise OSError("нет доступа к huggingface.co")

    def synthesize(self, text: str) -> bytes:
        self.texts.append(text)
        return b"OggS"


async def test_voice_service():
    tts = FakeTts()
    service = VoiceService(FakeStt(), tts)
    assert await service.transcribe(b"12345") == "распознано 5 байт"
    assert await service.speak("🌙 Спокойной ночи, Катя!") == b"OggS"
    assert tts.texts == ["Спокойной ночи, Катя!"]
    assert await service.speak("✨") is None  # нечего озвучивать


async def test_warm_up_reports_but_does_not_crash(caplog):
    stt = FakeStt()
    await VoiceService(stt, FakeTts(broken=True)).warm_up()
    assert stt.loaded
    assert "не загрузилась" in caplog.text


def test_create_voice_service(monkeypatch):
    assert create_voice_service(False, "small", "ru_RU-irina-medium", "models") is None
    monkeypatch.setattr(voice_module, "voice_libraries_installed", lambda: False)
    assert create_voice_service(True, "small", "ru_RU-irina-medium", "models") is None
    monkeypatch.setattr(voice_module, "voice_libraries_installed", lambda: True)
    service = create_voice_service(True, "base", "ru_RU-denis-medium", "/models")
    assert service.stt.model_name == "base"
    assert str(service.tts.voices_dir) == "/models/piper" and service.tts.voice_name == "ru_RU-denis-medium"
