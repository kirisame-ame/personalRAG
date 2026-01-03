FROM node:25-alpine3.22 AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build