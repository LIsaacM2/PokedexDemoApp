# Usamos una imagen oficial y ligera de Node.js basada en Alpine
FROM node:18-alpine

# Definimos el directorio de trabajo principal dentro del contenedor
WORKDIR /app

# Copiamos primero los archivos de dependencias para aprovechar el caché de Docker
COPY package*.json ./

# Instalamos las dependencias del proyecto
RUN npm install

# Copiamos el resto del código fuente del backend al contenedor
COPY . .

# Exponemos el puerto en el que correrá el servidor Express
EXPOSE 3000

# Comando por defecto para iniciar la aplicación en producción o desarrollo
CMD ["npm", "start"]