# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build
RUN test -s /app/dist/index.html \
    && test -s /app/dist/app/index.html \
    && grep -q 'CareerBridge' /app/dist/index.html \
    && ! grep -q 'Welcome to nginx' /app/dist/index.html

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist/ /srv/careerbridge/
RUN test -s /srv/careerbridge/index.html \
    && grep -q 'CareerBridge' /srv/careerbridge/index.html \
    && ! grep -q 'Welcome to nginx' /srv/careerbridge/index.html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/ | grep -q 'CareerBridge' || exit 1
