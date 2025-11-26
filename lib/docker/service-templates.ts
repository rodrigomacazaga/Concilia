// Templates de Dockerfile por tecnología

export const DOCKERFILE_TEMPLATES: Record<string, string> = {
  node: `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE {{PORT}}

CMD ["npm", "run", "dev"]
`,

  python: `FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE {{PORT}}

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "{{PORT}}", "--reload"]
`,

  go: `FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main .

EXPOSE {{PORT}}

CMD ["./main"]
`,

  java: `FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

COPY gradle ./gradle
COPY gradlew build.gradle settings.gradle ./
RUN ./gradlew dependencies --no-daemon

COPY src ./src
RUN ./gradlew build --no-daemon

EXPOSE {{PORT}}

CMD ["java", "-jar", "build/libs/app.jar"]
`,

  rust: `FROM rust:1.75-alpine AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/target/release/app .

EXPOSE {{PORT}}

CMD ["./app"]
`,

  dotnet: `FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

EXPOSE {{PORT}}

CMD ["dotnet", "app.dll"]
`
};

export const DOCKER_COMPOSE_LOCAL_TEMPLATE = `version: '3.8'

# Docker Compose para desarrollo AISLADO de {{SERVICE_NAME}}
# Ejecutar: docker-compose -f docker-compose.local.yml up

services:
  {{SERVICE_NAME}}:
    build: .
    container_name: {{SERVICE_NAME}}-dev
    ports:
      - "{{PORT}}:{{PORT}}"
    volumes:
      - ./src:/app/src
      - ./memory-bank:/app/memory-bank:ro
    environment:
      - NODE_ENV=development
      - PORT={{PORT}}
      - DEBUG=true
    restart: unless-stopped
`;

export const DOCKER_COMPOSE_SERVICE_TEMPLATE = `
  {{SERVICE_NAME}}:
    build: ./{{SERVICE_NAME}}
    container_name: {{PROJECT_NAME}}-{{SERVICE_NAME}}
    ports:
      - "{{PORT}}:{{PORT}}"
    volumes:
      - ./{{SERVICE_NAME}}/src:/app/src
    environment:
      - NODE_ENV=development
      - PORT={{PORT}}
    networks:
      - {{PROJECT_NAME}}-net
    restart: unless-stopped
`;

export const MASTER_DOCKER_COMPOSE_TEMPLATE = `version: '3.8'

# Docker Compose Maestro - {{PROJECT_NAME}}
# Auto-generado por Juliet Dev-Chat

services:

networks:
  {{PROJECT_NAME}}-net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
`;

// Templates de código inicial por tecnología
export const PACKAGE_JSON_TEMPLATE = `{
  "name": "{{SERVICE_NAME}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.2",
    "vitest": "^1.0.0"
  }
}
`;

export const TSCONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;

export const REQUIREMENTS_TXT_TEMPLATE = `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
httpx==0.25.2
`;

export const MAIN_TS_TEMPLATE = `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || {{PORT}};

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '{{SERVICE_NAME}}', timestamp: new Date().toISOString() });
});

// TODO: Add your endpoints here

app.listen(PORT, () => {
  console.log(\`{{SERVICE_NAME}} running on port \${PORT}\`);
});
`;

export const MAIN_PY_TEMPLATE = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="{{SERVICE_NAME}}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "{{SERVICE_NAME}}",
        "timestamp": datetime.now().isoformat()
    }

# TODO: Add your endpoints here
`;

export const DOCKERIGNORE_TEMPLATE = `node_modules
__pycache__
*.pyc
.git
.env
*.log
dist
.venv
.next
coverage
*.test.ts
*.spec.ts
`;
