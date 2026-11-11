FROM node:22-bookworm-slim

WORKDIR /app

# Separar manifiestos y código permite reutilizar la capa de dependencias cuando cambia el código.
COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]