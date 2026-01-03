FROM python:3.12-alpine3.22
WORKDIR /app

RUN pip install uv --no-cache

COPY requirements.txt requirements.txt

RUN uv pip install -r requirements.txt --system --no-cache

COPY src /app/src

EXPOSE 80 5005