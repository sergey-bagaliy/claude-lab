# Образ бота «Семейный помощник».
# Ключи в образ НЕ попадают: они передаются при запуске из файла .env (см. docker-compose.yml).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Голосовые библиотеки ставятся по умолчанию. Собрать без них (образ легче):
#   docker compose build --build-arg WITH_VOICE=0
ARG WITH_VOICE=1
COPY requirements.txt requirements-voice.txt ./
RUN pip install -r requirements.txt \
    && if [ "$WITH_VOICE" = "1" ]; then pip install -r requirements-voice.txt; fi

COPY main.py ./
COPY family_bot ./family_bot

# Бот работает не от root — так безопаснее.
RUN useradd --create-home --uid 1000 bot \
    && mkdir -p /data /models \
    && chown bot:bot /data /models
USER bot

# /data — база, резервные копии и журнал; /models — модели для голоса.
ENV DB_PATH=/data/family_bot.db \
    BACKUP_DIR=/data/backups \
    LOG_FILE=/data/bot.log \
    MODELS_DIR=/models \
    HF_HOME=/models/huggingface
VOLUME ["/data", "/models"]

CMD ["python", "main.py"]
