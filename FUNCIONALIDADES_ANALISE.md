# 📊 Análise de Dados - TimeSeries Monitor

## Novas Funcionalidades Implementadas

A página de **Upload dos Dados** foi aprimorada com análises estatísticas avançadas e visualizações interativas usando tecnologia similar ao Dash (Python) no frontend.

## 🚀 Como Usar

### 1. Upload dos Dados
1. Navegue para **Pipeline ML** na navbar
2. Faça upload de um arquivo CSV
3. Configure as colunas de timestamp e variável alvo
4. Clique em **"Analisar Dados"** para ver as estatísticas e gráficos

### 2. Arquivo de Exemplo
Um arquivo de teste está disponível em `/frontend/public/sample-data.csv` com:
- **Date**: Coluna temporal (2024-01-01 a 2024-01-30)
- **Sales**: Variável alvo numérica (vendas)
- **Temperature**: Variável explicativa (temperatura)
- **Customers**: Variável explicativa (número de clientes)
- **Product_Type**: Variável categórica (tipo de produto)

## 📈 Estatísticas Implementadas

### Estatísticas Gerais
- **Total de linhas** e **colunas**
- **Número de colunas numéricas** vs categóricas
- **Percentual de completude** dos dados
- **Valores faltantes** por dataset

### Análise da Variável Alvo
- **Média** e **Mediana**
- **Desvio Padrão** e **Amplitude**
- **Valores únicos** (para variáveis categóricas)
- **Valores faltantes**

### Estatísticas por Coluna
Tabela detalhada com:
- **Tipo de dados** (Numérico, Categórico, Texto)
- **Valores únicos** e **faltantes**
- **Estatísticas descritivas** (média, desvio padrão, min, max)
- **Destaque visual** da coluna alvo

## 📊 Visualizações Interativas

### 1. Série Temporal
- **Gráfico de linha** mostrando evolução da variável alvo ao longo do tempo
- **Interativo** com zoom, pan e hover
- **Detecção automática** de colunas de data

### 2. Distribuição (Histograma)
- **Histograma interativo** para variáveis numéricas
- **30 bins** para análise detalhada da distribuição
- **Seleção dinâmica** de variáveis

### 3. Análise de Outliers (Boxplot)
- **Boxplot interativo** para identificar valores atípicos
- **Quartis**, **mediana** e **outliers** claramente marcados
- **Estatísticas** visuais instantâneas

### 4. Análise de Correlação (Scatter Plot)
- **Gráfico de dispersão** entre duas variáveis numéricas
- **Seleção independente** de eixos X e Y
- **Identificação de padrões** e correlações

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React + TypeScript**
- **Plotly.js** para gráficos interativos
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes

### Bibliotecas de Análise
- **react-plotly.js**: Gráficos interativos similares ao Dash
- **Cálculos estatísticos**: Implementados em JavaScript
- **Detecção automática** de tipos de dados

## 🔧 Recursos Avançados

### Detecção Inteligente de Tipos
- **Algoritmo automático** para classificar colunas como:
  - Numéricas (>80% valores numéricos)
  - Categóricas (<10% valores únicos, <20 categorias)
  - Texto (demais casos)

### Interface Responsiva
- **Design adaptativo** para desktop e mobile
- **Controles intuitivos** para seleção de variáveis
- **Loading states** e **feedback** do usuário

### Performance Otimizada
- **Processamento lazy** de visualizações
- **Memoização** de cálculos pesados
- **Chunks otimizados** no build

## 📝 Fluxo de Trabalho

1. **Upload** → Carregamento e parsing do CSV
2. **Preview** → Visualização das primeiras 5 linhas
3. **Configuração** → Seleção de colunas timestamp e alvo
4. **Análise** → Botão para ativar estatísticas e gráficos
5. **Exploração** → Visualizações interativas dos dados
6. **Continuação** → Próxima etapa do pipeline ML

## 🎯 Benefícios

### Para Cientistas de Dados
- **Exploração rápida** dos dados
- **Identificação de padrões** visuais
- **Detecção de problemas** nos dados

### Para Analistas de Negócio  
- **Interface intuitiva** sem necessidade de código
- **Insights imediatos** sobre os dados
- **Gráficos prontos** para apresentações

### Para Desenvolvedores
- **Código modular** e reutilizável
- **TypeScript** para type safety
- **Componentes testáveis** e mantíveis

## 🔄 Próximos Passos

As funcionalidades estão prontas e funcionais. Para usar:

1. Execute `npm run dev` no diretório frontend
2. Navegue para Pipeline ML
3. Faça upload do arquivo `sample-data.csv` 
4. Configure Date como timestamp e Sales como alvo
5. Clique em "Analisar Dados" para ver todas as visualizações

A aplicação está rodando em **localhost:5173** com todas as funcionalidades implementadas e testadas! 