FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY admin_bot ./admin_bot
COPY configs ./configs
# Ключи передаются при запуске: docker run --env-file .env ...
VOLUME ["/app/data"]
CMD ["python", "-m", "admin_bot"]
