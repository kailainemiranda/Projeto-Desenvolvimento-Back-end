const request = require('supertest');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = require('../src/app');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');

beforeAll((done) => {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clienteId INTEGER NOT NULL,
        total REAL NOT NULL,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedidoId INTEGER NOT NULL,
        produto VARCHAR(255) NOT NULL,
        quantidade INTEGER NOT NULL,
        precoUnitario REAL NOT NULL,
        FOREIGN KEY (pedidoId) REFERENCES pedidos(id)
      )
    `, () => db.close(done));
  });
});

describe('POST /api/pedidos', () => {
  it('cria um pedido e calcula o total', async () => {
    const response = await request(app)
      .post('/api/pedidos')
      .send({
        clienteId: 10,
        itens: [{ produto: 'Feijão', quantidade: 2, precoUnitario: 5.99 }]
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.total).toBeCloseTo(11.98);
  });

  it('retorna 400 para solicitação sem clienteId', async () => {
    const response = await request(app)
      .post('/api/pedidos')
      .send({ itens: [{ produto: 'Arroz', quantidade: 1, precoUnitario: 10 }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('retorna 400 para item com quantidade inválida', async () => {
    const response = await request(app)
      .post('/api/pedidos')
      .send({ clienteId: 10, itens: [{ produto: 'Arroz', quantidade: 0, precoUnitario: 10 }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});