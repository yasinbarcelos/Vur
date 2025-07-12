# 🚀 VUR - Time Series Forecasting Platform

Uma plataforma completa para análise e previsão de séries temporais usando Machine Learning, construída com **React** + **TypeScript** no frontend e **FastAPI** + **Python** no backend.

## 📋 Índice

- [Características](#-características)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Desenvolvimento](#-desenvolvimento)
- [Docker](#-docker)
- [API Documentation](#-api-documentation)
- [Contribuição](#-contribuição)

## ✨ Características

### 🎯 **Core Features**

- **Upload de Dados**: Suporte para arquivos CSV, Excel e HDF5
- **Análise Exploratória**: Visualizações interativas e estatísticas descritivas
- **Múltiplos Algoritmos**: ARIMA, LSTM, Prophet, Random Forest
- **Previsões em Tempo Real**: Monitoramento contínuo com intervalos de confiança
- **Interface Intuitiva**: Dashboard moderno e responsivo

### 🔧 **Funcionalidades Técnicas**

- **Pipeline Completo**: Desde upload até deploy de modelos
- **Validação Automática**: Detecção de problemas nos dados
- **Métricas Avançadas**: MAE, RMSE, MAPE e visualizações
- **Monitoramento**: Sistema de logs e alertas
- **Escalabilidade**: Arquitetura containerizada

## 🛠️ Stack Tecnológica

### **Frontend**

- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Recharts** (Visualizações)
- **Shadcn/ui** (Componentes)
- **React Router** (Navegação)

### **Backend**

- **FastAPI** (Framework Python)
- **SQLAlchemy** (ORM)
- **Alembic** (Migrações)
- **PostgreSQL** (Banco de dados)
- **Redis** (Cache)
- **Pydantic** (Validação)

### **Machine Learning**

- **Pandas** + **NumPy** (Processamento)
- **Scikit-learn** (ML tradicional)
- **Statsmodels** (ARIMA)
- **Prophet** (Facebook Prophet)
- **TensorFlow** (Deep Learning)

### **DevOps**

- **Docker** + **Docker Compose**
- **Nginx** (Proxy reverso)
- **GitHub Actions** (CI/CD)

## 📋 Pré-requisitos

### **Para desenvolvimento local:**

- **Node.js** 18+ e **npm**
- **Python** 3.11+
- **PostgreSQL** 15+
- **Redis** 7+ (opcional)

### **Para Docker:**

- **Docker** 20.10+
- **Docker Compose** 2.0+

## 🚀 Instalação

### **Opção 1: Docker (Recomendado)**

1. **Clone o repositório:**

```bash
git clone https://github.com/your-org/vur.git
cd vur
```

2. **Configure as variáveis de ambiente:**

```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie os serviços:**

#### **✅ Opção A: Inicialização Completa (Mais Lenta)**

```bash
# Desenvolvimento - Todos os serviços
docker-compose -f docker-compose.dev.yml up --build

# Produção - Todos os serviços
docker-compose up --build
```

#### **⚡ Opção B: Inicialização por Partes (Recomendado - Mais Rápido)**

```bash
# 1. Iniciar apenas o banco de dados
docker-compose up -d postgres

# 2. Aguardar o banco estar pronto (cerca de 10 segundos)
docker logs vur_postgres

# 3. Iniciar o backend
docker-compose up -d backend

# 4. Verificar se está funcionando
curl http://localhost:8000/health
# Resposta esperada: {"status":"healthy","service":"VUR Backend","version":"1.0.0","environment":"development"}
```

4. **Acesse a aplicação:**

- **Backend API**: http://localhost:8000 ✅ **TESTADO E FUNCIONANDO**
- **Docs da API**: http://localhost:8000/docs ✅ **TESTADO E FUNCIONANDO**
- **Health Check**: http://localhost:8000/health ✅ **TESTADO E FUNCIONANDO**
- **Frontend**: http://localhost:3000 (em desenvolvimento)

### **Opção 2: Desenvolvimento Local**

#### **Backend Setup:**

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar banco de dados
alembic upgrade head

# Iniciar servidor
uvicorn main:app --reload
```

#### **Frontend Setup:**

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🎮 Uso

### **1. Upload de Dados**

- Acesse a página de **Pipeline**
- Faça upload de um arquivo CSV, Excel ou HDF5
- O sistema detectará automaticamente colunas de data e valores

### **2. Análise Exploratória**

- Visualize gráficos interativos dos seus dados
- Analise estatísticas descritivas
- Identifique padrões e tendências

### **3. Configuração do Modelo**

- Escolha o algoritmo de ML (ARIMA, LSTM, Prophet, etc.)
- Configure parâmetros específicos
- Defina período de treinamento e teste

### **4. Treinamento**

- Inicie o treinamento do modelo
- Acompanhe o progresso em tempo real
- Visualize métricas de performance

### **5. Monitoramento**

- Acesse a página de **Monitoramento**
- Selecione pipeline, modelo e banco de dados
- Visualize previsões em tempo real

## 👨‍💻 Desenvolvimento

### **Estrutura do Projeto**

```
vur/
├── frontend/                 # React + TypeScript
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── contexts/       # Context API
│   │   └── hooks/          # Custom hooks
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── api/            # Routers da API
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # Lógica de negócio
│   │   └── ml/             # Algoritmos de ML
│   ├── migrations/         # Migrações Alembic
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml       # Produção
├── docker-compose.dev.yml   # Desenvolvimento
└── TASKS.md                # Gerenciamento de tasks
```

### **Scripts Úteis**

#### **Frontend:**

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linting
npm run type-check   # Verificação de tipos
```

#### **Backend:**

```bash
uvicorn main:app --reload    # Servidor de desenvolvimento
alembic revision --autogenerate -m "description"  # Nova migração
alembic upgrade head         # Aplicar migrações
pytest                       # Executar testes
black .                      # Formatação de código
```

## 🐳 Docker

### **Status Atual - Testado e Funcionando ✅**

- **PostgreSQL**: ✅ Funcionando e saudável
- **Backend FastAPI**: ✅ Funcionando e saudável
- **Frontend React**: 🔄 Em desenvolvimento (build lento devido ao tamanho)

### **Comandos Docker Testados**

#### **Inicialização (Recomendado)**

```bash
# Método mais rápido - por partes
docker-compose up -d postgres    # Iniciar banco
docker-compose up -d backend     # Iniciar API

# Verificar status
docker ps
docker logs vur_backend_dev
docker logs vur_postgres

# Testar API
curl http://localhost:8000/health
```

#### **Comandos de Gerenciamento**

```bash
# Ver todos os containers
docker ps

# Parar serviços específicos
docker-compose stop backend
docker-compose stop postgres

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v

# Reiniciar serviço específico
docker-compose restart backend

# Ver logs em tempo real
docker-compose logs -f backend
docker-compose logs -f postgres

# Executar comandos no container
docker-compose exec backend bash
docker-compose exec postgres psql -U vur_user -d vur_db
```

#### **Desenvolvimento Completo (Mais Lento)**

```bash
# Desenvolvimento com hot reload
docker-compose -f docker-compose.dev.yml up --build

# Produção
docker-compose up --build
```

### **Serviços Disponíveis**

#### **Desenvolvimento (Testado):**

- **Backend API**: http://localhost:8000 ✅
- **API Docs**: http://localhost:8000/docs ✅
- **PostgreSQL**: localhost:5432 ✅
- **Frontend**: http://localhost:3000 (em desenvolvimento)
- **Redis**: localhost:6379 (opcional)
- **Adminer**: http://localhost:8080 (opcional)

#### **Produção:**

- **Application**: http://localhost
- **API**: http://localhost/api

### **🔧 Troubleshooting**

#### **Problema: Backend não inicia**

```bash
# Verificar logs
docker logs vur_backend_dev

# Problemas comuns:
# 1. Conflito de porta 8000
sudo lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# 2. Problema de configuração CORS
# Verificar arquivo .env e docker-compose.dev.yml
```

#### **Problema: Banco de dados não conecta**

```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Testar conexão
docker-compose exec postgres psql -U vur_user -d vur_db

# Limpar dados e reiniciar
docker-compose down -v
docker-compose up -d postgres
```

#### **Problema: Build do frontend muito lento**

```bash
# O build do frontend pode demorar devido ao tamanho do contexto
# Solução temporária: usar desenvolvimento local
cd frontend
npm install
npm run dev
```

#### **Problema: Conflito de rede Docker**

```bash
# Limpar redes Docker
docker network prune -f
docker-compose down
docker-compose up -d
```

## 📚 API Documentation

A documentação completa da API está disponível em:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### **Principais Endpoints:**

#### **Autenticação:**

- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login
- `GET /auth/me` - Perfil do usuário

#### **Pipelines:**

- `GET /pipelines` - Listar pipelines
- `POST /pipelines` - Criar pipeline
- `GET /pipelines/{id}` - Detalhes do pipeline

#### **Datasets:**

- `POST /datasets/upload` - Upload de CSV, Excel ou HDF5
- `GET /datasets/{id}/preview` - Preview dos dados

#### **Modelos:**

- `POST /models/train` - Treinar modelo
- `POST /models/{id}/predict` - Fazer previsão

#### **Monitoramento:**

- `GET /monitoring/predictions` - Previsões em tempo real
- `GET /monitoring/system` - Métricas do sistema

## 🤝 Contribuição

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### **Padrões de Código:**

- **Frontend**: ESLint + Prettier
- **Backend**: Black + isort + flake8
- **Commits**: Conventional Commits
- **Testes**: Jest (Frontend) + Pytest (Backend)

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/your-org/vur/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/vur/discussions)
- **Email**: team@vur.com

---

**Desenvolvido com ❤️ pela equipe VUR**
