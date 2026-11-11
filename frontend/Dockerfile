# Compila Vite con la URL relativa que luego resolverá el proxy de Nginx.
FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# La imagen final contiene solo los estáticos compilados y Nginx, no Node ni dependencias de desarrollo.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
