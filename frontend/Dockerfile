FROM node:25-alpine3.22 as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /.static

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 5201

CMD ["nginx", "-g", "daemon off;"]



