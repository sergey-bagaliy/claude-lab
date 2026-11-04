"""Голос: распознавание голосовых сообщений и ответы голосом. Всё бесплатно и работает
на вашем компьютере или сервере — интернет нужен только один раз, чтобы скачать модели.

• Распознавание речи — faster-whisper (модель Whisper). По умолчанию модель «small»:
  хорошо понимает русский, нужно около 1 ГБ памяти. На слабом сервере — «base».
• Озвучка — Piper, русский голос (по умолчанию ru_RU-irina-medium).
• Модели скачиваются с Hugging Face при первом запуске в папку models.

Библиотеки голоса тяжёлые, поэтому они необязательные: без них бот работает,
только голосовые не распознаёт (pip install -r requirements-voice.txt — включить).
"""

from __future__ import annotations

import asyncio
import importlib.util
import io
import logging
import re
import wave
from pathlib import Path

log = logging.getLogger(__name__)

MAX_VOICE_SECONDS = 120  # длиннее не распознаём — бережём процессор
MAX_SPEECH_CHARS = 3000  # примерно 3–4 минуты речи
VOICE_SETTING = "voice_replies"  # ключ в таблице настроек: отвечать ли голосом на голосовые

_URL = re.compile(r"https?://\S+")
_EMOJI = re.compile("[\U0001f000-\U0001faff☀-➿⬀-⯿️‍⃣]")
_MARKUP = re.compile(r"[*_#`>|]")


def clean_for_speech(text: str, limit: int = MAX_SPEECH_CHARS) -> str:
    """Готовит текст к озвучке: без ссылок, эмодзи, значков и списка источников."""
    text = text.split("\nИсточники:")[0]
    text = _URL.sub("", text)
    text = _EMOJI.sub("", text)
    text = _MARKUP.sub("", text).replace("•", "")
    lines = [" ".join(line.split()) for line in text.splitlines()]
    text = "\n".join(line for line in lines if line).strip()
    if len(text) > limit:
        cut = max(text.rfind(mark, 0, limit) for mark in (". ", "! ", "? ", "\n"))
        text = text[: cut + 1] if cut > limit // 2 else text[:limit]
    return text.strip()


def wav_to_ogg_opus(wav_bytes: bytes, bitrate: int = 32_000) -> bytes:
    """WAV → OGG/Opus — формат голосовых сообщений Telegram. Без внешнего ffmpeg (через PyAV)."""
    import av

    output = io.BytesIO()
    with av.open(io.BytesIO(wav_bytes)) as source, av.open(output, "w", format="ogg") as target:
        stream = target.add_stream("libopus", rate=48_000)
        stream.bit_rate = bitrate
        stream.layout = "mono"
        resampler = av.AudioResampler(format="s16", layout="mono", rate=48_000)
        fifo = av.AudioFifo()
        frame_size = stream.codec_context.frame_size or 960

        def encode(frame):
            for packet in stream.encode(frame):
                target.mux(packet)

        for frame in source.decode(audio=0):
            for resampled in resampler.resample(frame):
                fifo.write(resampled)
            while fifo.samples >= frame_size:
                encode(fifo.read(frame_size))
        for resampled in resampler.resample(None):
            fifo.write(resampled)
        if fifo.samples:
            encode(fifo.read())
        encode(None)
    return output.getvalue()


class SpeechToText:
    """Распознавание речи моделью Whisper (faster-whisper) на процессоре."""

    def __init__(self, model: str = "small", models_dir: str | Path = "models", cpu_threads: int = 0) -> None:
        self.model_name = model
        self.download_root = str(Path(models_dir) / "whisper")
        self.cpu_threads = cpu_threads
        self._model = None

    def load(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            log.info("Загружаю модель распознавания речи Whisper «%s»…", self.model_name)
            self._model = WhisperModel(
                self.model_name,
                device="cpu",
                compute_type="int8",  # экономит память, на качество почти не влияет
                cpu_threads=self.cpu_threads,
                download_root=self.download_root,
            )
        return self._model

    def transcribe(self, audio: bytes) -> str:
        segments, _info = self.load().transcribe(
            io.BytesIO(audio), language="ru", beam_size=5, vad_filter=True
        )
        return " ".join(segment.text.strip() for segment in segments).strip()


class TextToSpeech:
    """Озвучка текста голосом Piper."""

    def __init__(self, voice: str = "ru_RU-irina-medium", models_dir: str | Path = "models") -> None:
        self.voice_name = voice
        self.voices_dir = Path(models_dir) / "piper"
        self._voice = None

    def load(self):
        if self._voice is None:
            from piper import PiperVoice

            model_path = self.voices_dir / f"{self.voice_name}.onnx"
            if not model_path.exists():
                from piper.download_voices import download_voice

                log.info("Скачиваю голос Piper «%s»…", self.voice_name)
                self.voices_dir.mkdir(parents=True, exist_ok=True)
                download_voice(self.voice_name, self.voices_dir)
            self._voice = PiperVoice.load(model_path)
        return self._voice

    def synthesize(self, text: str) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            self.load().synthesize_wav(text, wav_file)
        return wav_to_ogg_opus(buffer.getvalue())


class VoiceService:
    """Обёртка для бота: тяжёлая работа — в отдельном потоке и по одной задаче за раз."""

    def __init__(self, stt: SpeechToText, tts: TextToSpeech) -> None:
        self.stt = stt
        self.tts = tts
        self._busy = asyncio.Semaphore(1)

    async def transcribe(self, audio: bytes) -> str:
        async with self._busy:
            return await asyncio.to_thread(self.stt.transcribe, audio)

    async def speak(self, text: str) -> bytes | None:
        cleaned = clean_for_speech(text)
        if not cleaned:
            return None
        async with self._busy:
            return await asyncio.to_thread(self.tts.synthesize, cleaned)

    async def warm_up(self) -> None:
        """Загружает модели заранее, чтобы первое голосовое не ждало минуту."""
        for name, part in (("распознавания речи", self.stt), ("озвучки", self.tts)):
            try:
                async with self._busy:
                    await asyncio.to_thread(part.load)
                log.info("Модель %s готова", name)
            except Exception as error:
                log.error(
                    "Модель %s не загрузилась: %s. Голосовые пока не будут работать — см. README, раздел «Голос».",
                    name,
                    error,
                )


def voice_libraries_installed() -> bool:
    return all(importlib.util.find_spec(name) is not None for name in ("faster_whisper", "piper", "av"))


def create_voice_service(
    enabled: bool, whisper_model: str, piper_voice: str, models_dir: str | Path
) -> VoiceService | None:
    if not enabled:
        log.info("Голосовые выключены (VOICE=0)")
        return None
    if not voice_libraries_installed():
        log.info("Голосовые выключены: не установлены библиотеки (pip install -r requirements-voice.txt)")
        return None
    return VoiceService(SpeechToText(whisper_model, models_dir), TextToSpeech(piper_voice, models_dir))
