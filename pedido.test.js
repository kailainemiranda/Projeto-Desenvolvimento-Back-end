const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

beforeAll((done) => {
  const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, clienteId INTEGER NOT NULL, total REAL NOT NULL, dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP)');
    db.run('CREATE TABLE IF NOT EXISTS itens_pedido (id INTEGER PRIMARY KEY AUTOINCREMENT, pedidoId INTEGER NOT NULL, produto VARCHAR(255) NOT NULL, quantidade INTEGER NOT NULL, precoUnitario REAL NOT NULL, FOREIGN KEY (pedidoId) REFERENCES pedidos(id))', done);
  });
});

describe('POST /api/pedidos', () => {
  it('Deve criar um pedido com sucesso e retornar 201', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({
        clienteId: 10,
        itens: [
          { produto: 'Feijão', quantidade: 2, precoUnitario: 5.99 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.total).toBeCloseTo(11.98);
  });

  it('Deve retornar 400 para solicitação sem clienteId', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({ itens: [{ produto: 'Arroz', quantidade: 1, precoUnitario: 10.0 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});