FROM node:20-alpine

# Instalar git para operaciones git
RUN apk add --no-cache git openssh-client

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Build de la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Comando para iniciar
CMD ["npm", "start"]
