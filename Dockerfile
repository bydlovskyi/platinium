# syntax=docker/dockerfile:1

# ---- build stage -----------------------------------------------------------
FROM node:20.19-alpine AS build

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json change.
COPY package.json package-lock.json ./
RUN npm ci

# Bring in the rest of the source and produce the production bundle.
# `npm run build` runs type-check + vite build (see package.json).
COPY . .
RUN npm run build

# ---- runtime stage ----------------------------------------------------------
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
