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
- **Upload de Dados**: Suporte para arquivos CSV com detecção automática de colunas
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
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up --build

# Produção
docker-compose up --build
```

4. **Acesse a aplicação:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Docs da API**: http://localhost:8000/docs

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
- Faça upload de um arquivo CSV com dados de série temporal
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

### **Comandos Docker**

```bash
# Desenvolvimento com hot reload
docker-compose -f docker-compose.dev.yml up --build

# Produção
docker-compose up --build

# Parar serviços
docker-compose down

# Ver logs
docker-compose logs -f [service_name]

# Executar comandos no container
docker-compose exec backend bash
docker-compose exec frontend sh
```

### **Serviços Disponíveis**

#### **Desenvolvimento:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Adminer**: http://localhost:8080
- **Redis Commander**: http://localhost:8081
- **Mailhog**: http://localhost:8025

#### **Produção:**
- **Application**: http://localhost
- **API**: http://localhost/api

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
- `POST /datasets/upload` - Upload de CSV
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