# syntax=docker/dockerfile:1

# ---- build stage -----------------------------------------------------------
FROM node:20.19-alpine AS build

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json change.
COPY package.json package-lock.json ./
# Lifecycle scripts need files not copied yet (openapi.yaml, .git); their outputs are committed.
RUN npm ci --ignore-scripts

# Bring in the rest of the source and produce the production bundle.
# `npm run build` runs type-check + vite build (see package.json).
COPY . .

# The mock API (MSW) is the only backend; set to "false" once a real API exists.
ARG VITE_ENABLE_MOCKS=true
ENV VITE_ENABLE_MOCKS=$VITE_ENABLE_MOCKS

RUN npm run build

# ---- runtime stage ----------------------------------------------------------
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
