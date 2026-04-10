FROM python:3.13-slim-bookworm
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --locked

COPY . .

EXPOSE 80 5200

CMD ["/app/.venv/bin/fastapi", "run", "main.py", "--port", "5200", "--host", "0.0.0.0"]