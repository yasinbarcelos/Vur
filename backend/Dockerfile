# Multi-stage build para otimização
FROM python:3.13-slim AS builder

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY requirements.txt .
COPY pyproject.toml .

# Instalar dependências Python
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Estágio de produção
FROM python:3.13-slim

# Instalar dependências mínimas do sistema
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar dependências do estágio builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários com permissões corretas - EXECUTANDO COMO ROOT
RUN mkdir -p /app/logs /app/uploads /app/models /app/uploads/datasets
RUN chmod -R 777 /app/uploads /app/models /app/logs
RUN ls -la /app/uploads

# Configurar variáveis de ambiente
ENV ENVIRONMENT=development
ENV DEBUG=true
ENV LOG_LEVEL=INFO
ENV DATABASE_URL=sqlite:///./vur_dev.db
ENV SECRET_KEY=your-super-secret-key-change-in-production-docker
ENV ALGORITHM=HS256
ENV ACCESS_TOKEN_EXPIRE_MINUTES=30
ENV ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://127.0.0.1:3000,http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8083,*
ENV MAX_FILE_SIZE=10485760
ENV UPLOAD_DIR=/app/uploads
ENV MODELS_DIR=/app/models
ENV RATE_LIMIT_PER_MINUTE=60
ENV MAX_TRAINING_TIME=3600
ENV DEFAULT_TRAIN_TEST_SPLIT=0.8
ENV DEFAULT_VALIDATION_SPLIT=0.2
ENV MAX_PREDICTION_HORIZON=365
ENV DEFAULT_CONFIDENCE_INTERVAL=0.95

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando para iniciar a aplicação - executando como root para resolver permissões
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"] 