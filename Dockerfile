# ===========================================
# DOCKERFILE UNIFICADO - AUTO ATENDIMENTO
# ===========================================
# Multi-stage build: Frontend + Backend em um único serviço

# -----------------------------------------
# Stage 1: Build do Frontend
# -----------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar arquivos de dependências
COPY frontend/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY frontend/ ./

# Build argument para URL da API (em produção, usa o mesmo domínio)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build do frontend
RUN npm run build

# -----------------------------------------
# Stage 2: Build do Backend
# -----------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copiar arquivos de dependências
COPY backend/package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar schema do Prisma primeiro
COPY backend/prisma ./prisma

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY backend/ ./

# Build do TypeScript
RUN npm run build

# -----------------------------------------
# Stage 3: Produção
# -----------------------------------------
FROM node:20-alpine AS production

# Instalar OpenSSL (necessário para Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Instalar apenas dependências de produção do backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar Prisma schema e gerar cliente
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copiar build do backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar build do frontend para pasta public
COPY --from=frontend-builder /app/frontend/dist ./public

# Criar diretório de uploads
RUN mkdir -p uploads/images

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Expor porta
EXPOSE 3001

# Comando para iniciar (roda migrations e inicia servidor)
CMD npx prisma migrate deploy && node dist/index.js
