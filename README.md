# Sistema de Autoatendimento

Sistema de autoatendimento para mercado/loja com pagamento via Mercado Pago.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Banco de Dados**: PostgreSQL
- **Pagamento**: Mercado Pago

## Funcionalidades

### Cliente
- Listagem de produtos por categoria
- Busca de produtos
- Leitor de código de barras
- Carrinho de compras
- Checkout com Mercado Pago (PIX, Cartão, etc)

### Painel Admin
- Dashboard com métricas
- CRUD de produtos
- Visualização de pedidos

## Instalação

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- Conta no Mercado Pago (para pagamentos)

### 1. Clone o repositório

```bash
git clone <repo-url>
cd auto-atendimento
```

### 2. Configure o Backend

```bash
cd backend

# Copie o arquivo de ambiente
cp .env.example .env

# Edite o .env com suas configurações
# DATABASE_URL, JWT_SECRET, MERCADOPAGO_ACCESS_TOKEN

# Instale as dependências
npm install

# Gere o cliente Prisma
npm run db:generate

# Execute as migrations
npm run db:migrate

# Popule o banco com dados de exemplo
npm run db:seed
```

### 3. Configure o Frontend

```bash
cd frontend

# Copie o arquivo de ambiente
cp .env.example .env

# Instale as dependências
npm install
```

## Executando

### Backend

```bash
cd backend
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

### Frontend

```bash
cd frontend
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Credenciais de Acesso

Após executar o seed, você pode acessar o painel admin com:

- **Email**: admin@mercado.com
- **Senha**: admin123

## Estrutura do Projeto

```
auto-atendimento/
├── frontend/          # Aplicação React
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── context/     # Context API (carrinho)
│   │   ├── services/    # Serviços de API
│   │   └── types/       # Tipos TypeScript
│   └── ...
│
├── backend/           # API Express
│   ├── src/
│   │   ├── controllers/ # Controllers
│   │   ├── routes/      # Rotas
│   │   ├── middlewares/ # Middlewares
│   │   └── services/    # Serviços
│   ├── prisma/
│   │   ├── schema.prisma # Schema do banco
│   │   └── seed.ts       # Seed de dados
│   └── ...
│
└── README.md
```

## API Endpoints

### Públicos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Detalhe do produto
- `GET /api/products/barcode/:code` - Buscar por código de barras
- `POST /api/orders` - Criar pedido
- `GET /api/orders/:id` - Detalhe do pedido
- `POST /api/payments/create-preference` - Criar preferência de pagamento
- `GET /api/payments/status/:id` - Status do pagamento

### Autenticação
- `POST /api/auth/login` - Login

### Admin (requer autenticação)
- `GET /api/admin/dashboard` - Dados do dashboard
- `POST /api/admin/products` - Criar produto
- `PUT /api/admin/products/:id` - Atualizar produto
- `DELETE /api/admin/products/:id` - Remover produto
- `GET /api/admin/orders` - Listar pedidos

## Configuração do Mercado Pago

1. Crie uma conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Crie uma aplicação
3. Obtenha o Access Token (use o de teste para desenvolvimento)
4. Configure no `.env` do backend

## Licença

MIT
