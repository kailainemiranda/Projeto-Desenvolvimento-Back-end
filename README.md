# Rede Raízes - Backend RESTful API

API desenvolvida em Node.js e Express para gestão modular de pedidos e suporte a pequenos produtores e cooperativas.

## Estrutura do Projeto

```text
src/
├── app.js
├── server.js
├── controllers/PedidoController.js
├── models/Pedido.js
└── routes/pedidoRoutes.js
tests/pedido.test.js
init_db.js
```

O backend implementa a criação de pedidos por meio do endpoint `POST /api/pedidos`. Cada pedido possui um cliente, um total calculado a partir dos itens e os respectivos produtos, quantidades e preços unitários.

## 🚀 Arquitetura & Tecnologias
- **Node.js (v20 LTS)** + **Express.js**
- **SQLite3** para persistência leve de dados
- **Helmet** & **CORS** para segurança de rotas
- **Jest** & **Supertest** para testes integrados

## 🛠️ Como Executar

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Inicializar o banco de dados:**
   ```bash
   npm run init-db
   ```

3. **Executar a aplicação:**
   ```bash
   npm start
   ```

4. **Executar os testes automatizados:**
   ```bash
   npm test
   ```

O servidor é iniciado em `http://localhost:3000` por padrão. A porta pode ser alterada pela variável de ambiente `PORT`.

## 📬 Exemplo de Requisição (Endpoints)

- **POST `/api/pedidos`**
  ```json
  {
    "clienteId": 123,
    "itens": [
      {
        "produto": "Feijão",
        "quantidade": 2,
        "precoUnitario": 5.99
      }
    ]
  }
  ```
