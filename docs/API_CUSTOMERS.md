# API REST - Cadastro de Clientes do Mercado Autônomo

Base URL: `http://localhost:3001/api`

## Autenticação

Todas as rotas (exceto busca por CPF) requerem autenticação via Bearer Token.

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Listar Clientes

**GET** `/customers?storeId={storeId}`

Lista todos os clientes de uma loja com paginação e filtros.

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| storeId | string | Sim | ID da loja |
| search | string | Não | Busca por nome, CPF, telefone ou email |
| condominium | string | Não | Filtrar por condomínio |
| active | boolean | Não | Filtrar por status (true/false) |
| page | number | Não | Página (default: 1) |
| limit | number | Não | Itens por página (default: 20, max: 100) |

#### Exemplo de Requisição

```bash
curl -X GET "http://localhost:3001/api/customers?storeId=abc123&search=maria&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Resposta de Sucesso (200)

```json
{
  "data": [
    {
      "id": "uuid-do-cliente",
      "name": "Maria Silva",
      "cpf": "12345678901",
      "rg": "123456789",
      "phone": "11999998888",
      "email": "maria@email.com",
      "photo": "https://url-da-foto.jpg",
      "condominium": "Residencial Flores",
      "block": "A",
      "unit": "101",
      "active": true,
      "notes": "Cliente VIP",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "_count": {
        "orders": 15
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 2. Buscar Cliente por ID

**GET** `/customers/{id}?storeId={storeId}`

Retorna os dados completos de um cliente, incluindo últimos pedidos.

#### Parâmetros

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| id | string | path | Sim | ID do cliente |
| storeId | string | query | Sim | ID da loja |

#### Exemplo de Requisição

```bash
curl -X GET "http://localhost:3001/api/customers/uuid-do-cliente?storeId=abc123" \
  -H "Authorization: Bearer <token>"
```

#### Resposta de Sucesso (200)

```json
{
  "id": "uuid-do-cliente",
  "name": "Maria Silva",
  "cpf": "12345678901",
  "rg": "123456789",
  "phone": "11999998888",
  "email": "maria@email.com",
  "photo": "https://url-da-foto.jpg",
  "condominium": "Residencial Flores",
  "block": "A",
  "unit": "101",
  "active": true,
  "notes": "Cliente VIP",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "orders": [
    {
      "id": "uuid-do-pedido",
      "status": "PAID",
      "total": "45.90",
      "createdAt": "2024-01-20T15:00:00Z",
      "paymentMethod": "credit_card"
    }
  ],
  "_count": {
    "orders": 15
  }
}
```

---

### 3. Buscar Cliente por CPF (Pública)

**GET** `/customers/cpf/{cpf}?storeId={storeId}`

Busca um cliente pelo CPF. Esta rota é pública (não requer autenticação) para uso no terminal de autoatendimento.

#### Parâmetros

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| cpf | string | path | Sim | CPF (com ou sem formatação) |
| storeId | string | query | Sim | ID da loja |

#### Exemplo de Requisição

```bash
curl -X GET "http://localhost:3001/api/customers/cpf/12345678901?storeId=abc123"
```

#### Resposta de Sucesso (200)

```json
{
  "id": "uuid-do-cliente",
  "name": "Maria Silva",
  "cpf": "12345678901",
  "phone": "11999998888",
  "photo": "https://url-da-foto.jpg",
  "condominium": "Residencial Flores",
  "block": "A",
  "unit": "101",
  "active": true
}
```

#### Resposta de Erro - Cliente Inativo (403)

```json
{
  "error": "Cliente inativo",
  "customer": {
    "id": "uuid-do-cliente",
    "name": "Maria Silva",
    "active": false
  }
}
```

---

### 4. Criar Cliente

**POST** `/customers?storeId={storeId}`

Cadastra um novo cliente na loja.

#### Body (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| name | string | Sim | Nome completo |
| cpf | string | Sim | CPF (apenas números ou formatado) |
| rg | string | Não | RG |
| phone | string | Sim | Telefone com DDD (10 ou 11 dígitos) |
| email | string | Não | Email |
| photo | string | Não | URL da foto |
| condominium | string | Sim | Nome do condomínio |
| block | string | Não | Bloco/Torre |
| unit | string | Sim | Apartamento/Unidade |
| notes | string | Não | Observações |

#### Exemplo de Requisição

```bash
curl -X POST "http://localhost:3001/api/customers?storeId=abc123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Santos",
    "cpf": "123.456.789-01",
    "rg": "12.345.678-9",
    "phone": "(11) 99999-8888",
    "email": "joao@email.com",
    "photo": "https://storage.example.com/photos/joao.jpg",
    "condominium": "Residencial Flores",
    "block": "B",
    "unit": "202",
    "notes": "Prefere pagamento em débito"
  }'
```

#### Resposta de Sucesso (201)

```json
{
  "id": "uuid-do-novo-cliente",
  "name": "João Santos",
  "cpf": "12345678901",
  "rg": "123456789",
  "phone": "11999998888",
  "email": "joao@email.com",
  "photo": "https://storage.example.com/photos/joao.jpg",
  "condominium": "Residencial Flores",
  "block": "B",
  "unit": "202",
  "active": true,
  "notes": "Prefere pagamento em débito",
  "storeId": "abc123",
  "createdAt": "2024-01-25T10:00:00Z",
  "updatedAt": "2024-01-25T10:00:00Z"
}
```

#### Erros Possíveis

| Código | Erro | Descrição |
|--------|------|-----------|
| 400 | Nome é obrigatório | Campo name vazio ou ausente |
| 400 | CPF é obrigatório | Campo cpf ausente |
| 400 | CPF inválido | CPF não passa na validação |
| 400 | Telefone é obrigatório | Campo phone ausente |
| 400 | Telefone inválido | Telefone não tem 10 ou 11 dígitos |
| 400 | Condomínio é obrigatório | Campo condominium vazio |
| 400 | Unidade/Apartamento é obrigatório | Campo unit vazio |
| 404 | Loja não encontrada | storeId inválido |
| 409 | Já existe um cliente com este CPF | CPF duplicado na loja |

---

### 5. Atualizar Cliente

**PUT** `/customers/{id}?storeId={storeId}`

Atualiza os dados de um cliente existente.

#### Parâmetros

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| id | string | path | Sim | ID do cliente |
| storeId | string | query | Sim | ID da loja |

#### Body (JSON)

Todos os campos são opcionais. Envie apenas os campos que deseja atualizar.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | string | Nome completo |
| cpf | string | CPF |
| rg | string | RG (envie null para remover) |
| phone | string | Telefone |
| email | string | Email (envie null para remover) |
| photo | string | URL da foto (envie null para remover) |
| condominium | string | Nome do condomínio |
| block | string | Bloco/Torre (envie null para remover) |
| unit | string | Apartamento/Unidade |
| notes | string | Observações (envie null para remover) |
| active | boolean | Status do cliente |

#### Exemplo de Requisição

```bash
curl -X PUT "http://localhost:3001/api/customers/uuid-do-cliente?storeId=abc123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "(11) 98888-7777",
    "unit": "303",
    "notes": "Mudou de apartamento"
  }'
```

#### Resposta de Sucesso (200)

```json
{
  "id": "uuid-do-cliente",
  "name": "João Santos",
  "cpf": "12345678901",
  "rg": "123456789",
  "phone": "11988887777",
  "email": "joao@email.com",
  "photo": "https://storage.example.com/photos/joao.jpg",
  "condominium": "Residencial Flores",
  "block": "B",
  "unit": "303",
  "active": true,
  "notes": "Mudou de apartamento",
  "storeId": "abc123",
  "createdAt": "2024-01-25T10:00:00Z",
  "updatedAt": "2024-01-25T14:30:00Z"
}
```

---

### 6. Desativar/Remover Cliente

**DELETE** `/customers/{id}?storeId={storeId}`

Por padrão, apenas desativa o cliente (soft delete). Use `permanent=true` para remoção definitiva.

#### Parâmetros

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| id | string | path | Sim | ID do cliente |
| storeId | string | query | Sim | ID da loja |
| permanent | boolean | query | Não | Se true, remove permanentemente |

#### Exemplo - Desativar (Soft Delete)

```bash
curl -X DELETE "http://localhost:3001/api/customers/uuid-do-cliente?storeId=abc123" \
  -H "Authorization: Bearer <token>"
```

Resposta:
```json
{
  "message": "Cliente desativado"
}
```

#### Exemplo - Remoção Permanente

```bash
curl -X DELETE "http://localhost:3001/api/customers/uuid-do-cliente?storeId=abc123&permanent=true" \
  -H "Authorization: Bearer <token>"
```

Resposta:
```json
{
  "message": "Cliente removido permanentemente"
}
```

**Nota:** A remoção permanente só é permitida se o cliente não possui pedidos.

---

### 7. Listar Condomínios

**GET** `/customers/condominiums?storeId={storeId}`

Lista todos os condomínios cadastrados na loja (para uso em filtros/autocomplete).

#### Exemplo de Requisição

```bash
curl -X GET "http://localhost:3001/api/customers/condominiums?storeId=abc123" \
  -H "Authorization: Bearer <token>"
```

#### Resposta de Sucesso (200)

```json
[
  { "name": "Residencial Flores", "count": 45 },
  { "name": "Condomínio Park", "count": 32 },
  { "name": "Edifício Central", "count": 18 }
]
```

---

### 8. Estatísticas de Clientes

**GET** `/customers/stats?storeId={storeId}`

Retorna estatísticas gerais sobre os clientes da loja.

#### Exemplo de Requisição

```bash
curl -X GET "http://localhost:3001/api/customers/stats?storeId=abc123" \
  -H "Authorization: Bearer <token>"
```

#### Resposta de Sucesso (200)

```json
{
  "total": 150,
  "active": 142,
  "inactive": 8,
  "topCondominiums": [
    { "name": "Residencial Flores", "count": 45 },
    { "name": "Condomínio Park", "count": 32 },
    { "name": "Edifício Central", "count": 18 },
    { "name": "Vila Verde", "count": 15 },
    { "name": "Solar das Palmeiras", "count": 12 }
  ],
  "ordersLast30Days": 234
}
```

---

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida (validação falhou) |
| 401 | Não autorizado |
| 403 | Acesso negado (ex: cliente inativo) |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: CPF duplicado) |
| 500 | Erro interno do servidor |

---

## Validações

### CPF
- Deve conter 11 dígitos
- É validado algoritmicamente
- Único por loja

### Telefone
- Deve conter 10 ou 11 dígitos (com DDD)
- Aceita formatação: (11) 99999-8888 ou 11999998888

### Campos Obrigatórios para Cadastro
- name (Nome completo)
- cpf (CPF)
- phone (Telefone)
- condominium (Nome do condomínio)
- unit (Apartamento/Unidade)

---

## Exemplos de Uso com cURL

### Cadastro Completo de Cliente

```bash
curl -X POST "http://localhost:3001/api/customers?storeId=abc123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ana Paula Oliveira",
    "cpf": "987.654.321-00",
    "rg": "98.765.432-1",
    "phone": "(21) 98765-4321",
    "email": "ana.paula@email.com",
    "photo": "https://storage.example.com/customers/ana.jpg",
    "condominium": "Residencial Vista Mar",
    "block": "Torre Sul",
    "unit": "1502",
    "notes": "Alérgica a glúten - avisar sobre produtos"
  }'
```

### Buscar Cliente no Autoatendimento (por CPF)

```bash
curl -X GET "http://localhost:3001/api/customers/cpf/98765432100?storeId=abc123"
```

### Desativar Cliente

```bash
curl -X PUT "http://localhost:3001/api/customers/uuid-cliente?storeId=abc123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### Listar Clientes com Filtros

```bash
# Buscar por nome
curl -X GET "http://localhost:3001/api/customers?storeId=abc123&search=maria" \
  -H "Authorization: Bearer <token>"

# Filtrar por condomínio
curl -X GET "http://localhost:3001/api/customers?storeId=abc123&condominium=Residencial" \
  -H "Authorization: Bearer <token>"

# Apenas inativos
curl -X GET "http://localhost:3001/api/customers?storeId=abc123&active=false" \
  -H "Authorization: Bearer <token>"
```

---

## Upload de Foto

Para upload de fotos de clientes, utilize o endpoint de upload existente:

**POST** `/upload/image`

```bash
curl -X POST "http://localhost:3001/api/upload/image" \
  -H "Authorization: Bearer <token>" \
  -F "file=@foto-cliente.jpg"
```

Resposta:
```json
{
  "url": "http://localhost:3001/uploads/images/abc123.jpg"
}
```

Use a URL retornada no campo `photo` ao criar/atualizar o cliente.
