FROM python:3.13-slim-bookworm
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir uv
RUN uv venv /opt/venv

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --active

COPY . .

EXPOSE 80 5200

CMD ["fastapi", "run", "main.py", "--port", "5200", "--host", "0.0.0.0"]