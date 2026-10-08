# ---- stage 1: build the React app ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# the git commit shown in the UI footer; CI passes the real SHA
ARG COMMIT_SHA=local
ENV VITE_COMMIT_SHA=$COMMIT_SHA

RUN npm run build

# ---- stage 2: serve the static files with Nginx (runs as non-root uid 101) ----
FROM nginxinc/nginx-unprivileged:1.28-alpine

# filled into the nginx template at container start; override per environment
ENV BACKEND_URL=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
