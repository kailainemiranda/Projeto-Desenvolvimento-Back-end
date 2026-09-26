# Projeto Multidisciplinar: Rede Raízes do Nordeste (Backend V2)

Este repositório contém a implementação completa, testada e modularizada do backend da **Rede Raízes do Nordeste**, desenvolvido em **Node.js, Express e SQLite3**.

---

## 📁 Estrutura de Diretórios do Repositório

```text
rede-raizes-dn/
├── src/
│   ├── app.js                 # Configuração do Express, Helmet e CORS
│   ├── server.js              # Ponto de entrada do servidor HTTP
│   ├── controllers/
│   │   └── PedidoController.js# Controladores da lógica de negócio
│   ├── models/
│   │   └── Pedido.js          # Persistência de dados e regras SQLite
│   └── routes/
│       └── pedidoRoutes.js    # Definições de rotas da API RESTful
├── tests/
│   └── pedido.test.js         # Testes de integração com Jest e Supertest
├── docs/
│   └── DOCUMENTACAO.md        # Documentação técnica e arquitetural
├── init_db.js                 # Script de migração/criação do banco de dados
├── package.json               # Gerenciador de dependências e scripts
├── .env.example               # Exemplo de variáveis de ambiente
├── .gitignore                 # Configuração de arquivos ignorados
└── README.md                  # Instruções de execução e arquitetura
```

---

## 🛠️ Arquivos do Projeto

### 1. `package.json`
```json
{
  "name": "rede-raizes-dn",
  "version": "2.0.0",
  "description": "API RESTful para gestão de pedidos, estoque e produtores rurais - Rede Raízes do Nordeste",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "init-db": "node init_db.js",
    "test": "jest --runInBand --detectOpenHandles"
  },
  "keywords": ["express", "sqlite3", "rest-api", "esg"],
  "author": "Kailaine Barbosa",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.0.0",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

---

### 2. `init_db.js`
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar/criar o banco de dados SQLite:', err.message);
    process.exit(1);
  }
  console.log('Conectado ao banco SQLite com sucesso.');
});

db.serialize(() => {
  // Tabela de Pedidos
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER NOT NULL,
      total REAL NOT NULL,
      dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Erro ao criar tabela pedidos:', err.message);
    else console.log('Tabela "pedidos" criada/verificada.');
  });

  // Tabela de Itens do Pedido
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedidoId INTEGER NOT NULL,
      produto VARCHAR(255) NOT NULL,
      quantidade INTEGER NOT NULL,
      precoUnitario REAL NOT NULL,
      FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Erro ao criar tabela itens_pedido:', err.message);
    else console.log('Tabela "itens_pedido" criada/verificada.');
  });
});

db.close();
```

---

### 3. `src/models/Pedido.js`
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolução de caminho absoluto para evitar bug SQLite ERROR: no such table
const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

class Pedido {
  static criar(clienteId, itens, total) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmtPedido = db.prepare('INSERT INTO pedidos (clienteId, total) VALUES (?, ?)');
        stmtPedido.run([clienteId, total], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const pedidoId = this.lastID;
          const stmtItem = db.prepare(
            'INSERT INTO itens_pedido (pedidoId, produto, quantidade, precoUnitario) VALUES (?, ?, ?, ?)'
          );

          let erroOcorrido = false;
          itens.forEach((item) => {
            stmtItem.run([pedidoId, item.produto, item.quantidade, item.precoUnitario], (errItem) => {
              if (errItem) erroOcorrido = true;
            });
          });

          stmtItem.finalize((errFinalize) => {
            if (errFinalize || erroOcorrido) {
              db.run('ROLLBACK');
              return reject(errFinalize || new Error('Falha ao inserir itens do pedido. Transaction abortada.'));
            }

            db.run('COMMIT', (errCommit) => {
              if (errCommit) return reject(errCommit);
              resolve(pedidoId);
            });
          });
        });
      });
    });
  }

  static listarTodos() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.id as pedidoId, p.clienteId, p.total, p.dataCriacao,
               i.id as itemId, i.produto, i.quantidade, i.precoUnitario
        FROM pedidos p
        LEFT JOIN itens_pedido i ON p.id = i.pedidoId
        ORDER BY p.id DESC
      `;

      db.all(query, [], (err, rows) => {
        if (err) return reject(err);

        const mapaPedidos = {};
        rows.forEach((row) => {
          if (!mapaPedidos[row.pedidoId]) {
            mapaPedidos[row.pedidoId] = {
              id: row.pedidoId,
              clienteId: row.clienteId,
              total: row.total,
              dataCriacao: row.dataCriacao,
              itens: []
            };
          }
          if (row.itemId) {
            mapaPedidos[row.pedidoId].itens.push({
              id: row.itemId,
              produto: row.produto,
              quantidade: row.quantidade,
              precoUnitario: row.precoUnitario
            });
          }
        });

        resolve(Object.values(mapaPedidos));
      });
    });
  }

  static buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.id as pedidoId, p.clienteId, p.total, p.dataCriacao,
               i.id as itemId, i.produto, i.quantidade, i.precoUnitario
        FROM pedidos p
        LEFT JOIN itens_pedido i ON p.id = i.pedidoId
        WHERE p.id = ?
      `;

      db.all(query, [id], (err, rows) => {
        if (err) return reject(err);
        if (rows.length === 0) return resolve(null);

        const pedido = {
          id: rows[0].pedidoId,
          clienteId: rows[0].clienteId,
          total: rows[0].total,
          dataCriacao: rows[0].dataCriacao,
          itens: []
        };

        rows.forEach((row) => {
          if (row.itemId) {
            pedido.itens.push({
              id: row.itemId,
              produto: row.produto,
              quantidade: row.quantidade,
              precoUnitario: row.precoUnitario
            });
          }
        });

        resolve(pedido);
      });
    });
  }
}

module.exports = Pedido;
```

---

### 4. `src/controllers/PedidoController.js`
```javascript
const Pedido = require('../models/Pedido');

exports.criarPedido = async (req, res) => {
  try {
    const { clienteId, itens } = req.body;

    // Validação de presença e integridade de estrutura
    if (!clienteId || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Dados inválidos: clienteId e lista de itens são obrigatórios." });
    }

    // Validação de atributos de cada item
    for (const item of itens) {
      if (
        !item.produto ||
        typeof item.quantidade !== 'number' || item.quantidade <= 0 ||
        typeof item.precoUnitario !== 'number' || item.precoUnitario <= 0
      ) {
        return res.status(400).json({
          error: "Dados inválidos nos itens: quantidade e precoUnitario devem ser numéricos e maiores que zero."
        });
      }
    }

    // Cálculo dinâmico do valor total acumulado
    const total = itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0);

    // Salva no banco de dados SQLite
    const pedidoId = await Pedido.criar(clienteId, itens, total);

    return res.status(201).json({
      id: pedidoId,
      clienteId,
      total,
      mensagem: "Pedido criado com sucesso"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.listarTodos();
    return res.status(200).json(pedidos);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.buscarPedidoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.buscarPorId(id);

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
```

---

### 5. `src/routes/pedidoRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const PedidoController = require('../controllers/PedidoController');

router.post('/', PedidoController.criarPedido);
router.get('/', PedidoController.listarPedidos);
router.get('/:id', PedidoController.buscarPedidoPorId);

module.exports = router;
```

---

### 6. `src/app.js`
```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Middlewares de segurança e parse de JSON
app.use(helmet());
app.use(cors());
app.use(express.json());

// Registro de rotas
app.use('/api/pedidos', require('./routes/pedidoRoutes'));

// Trata erro de rota inexistente (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Trata exceções não capturadas (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

module.exports = app;
```

---

### 7. `src/server.js`
```javascript
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso em http://localhost:${PORT}`);
});
```

---

### 8. `tests/pedido.test.js`
```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Suíte de Testes Automatizados - PedidoController', () => {

  it('Deve criar um novo pedido com sucesso (Status 201)', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({
        clienteId: 123,
        itens: [
          { produto: "Feijão", quantidade: 2, precoUnitario: 5.99 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.total).toBeCloseTo(11.98);
  });

  it('Deve retornar erro 400 ao enviar dados de cliente vazios ou inválidos', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({ clienteId: null });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('Deve retornar erro 400 se o preço unitário ou a quantidade do item for menor ou igual a zero', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({
        clienteId: 1,
        itens: [
          { produto: "Arroz", quantidade: -1, precoUnitario: 10.0 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
```

---

### 9. `README.md`
```markdown
# Rede Raízes do Nordeste - Backend API

Projeto desenvolvido para gestão de pedidos e apoio a pequenos produtores rurais, seguindo os princípios de qualidade de software, arquitetura em camadas e práticas ESG (ODS 2, 9 e 12).

## 🚀 Como Executar o Projeto

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Inicializar o Banco de Dados:**
   ```bash
   node init_db.js
   ```

3. **Executar a aplicação:**
   ```bash
   npm start
   ```

4. **Executar os testes automatizados:**
   ```bash
   npm test
   ```

## 🧪 Testes Manuais com cURL

```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{"clienteId": 123, "itens": [{"produto": "Feijão", "quantidade": 2, "precoUnitario": 5.99}]}'
```
```