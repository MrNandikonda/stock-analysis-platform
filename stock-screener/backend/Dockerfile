FROM python:3.11-alpine AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

COPY requirements-runtime.txt .
RUN pip install --upgrade pip wheel \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements-runtime.txt

FROM python:3.11-alpine AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=prod \
    API_PREFIX=/api/v1

WORKDIR /app

RUN apk add --no-cache \
    libstdc++ \
    tzdata

COPY --from=builder /wheels /wheels
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements-runtime.txt \
    && rm -rf /wheels

COPY app ./app
COPY migrations ./migrations

RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

