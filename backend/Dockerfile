FROM node:18-alpine

WORKDIR /app

# Separar manifiestos y código permite reutilizar la capa de dependencias cuando cambia el código.
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]