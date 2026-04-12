FROM node:25-alpine3.22 as builder

WORKDIR /app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /.static

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5300

CMD ["nginx", "-g", "daemon off;"]



