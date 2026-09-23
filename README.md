# Rede Raízes - Backend RESTful API

API desenvolvida em Node.js e Express para gestão modular de pedidos e suporte a pequenos produtores e cooperativas.

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
