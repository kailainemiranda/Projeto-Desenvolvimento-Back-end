const request = require('supertest');
const app = require('../src/app');

describe('Fluxo integrado de pedidos', () => {
  let token;
  let produtoId;

  beforeAll(async () => {
    const email = `pedidos-${Date.now()}@raizes.local`;
    await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Operador de pedidos', email, senha: 'segredo123' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'segredo123' });
    token = login.body.token;

    const produto = await request(app)
      .post('/api/estoque/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Cuscuz artesanal', preco: 15, estoqueQuantidade: 100 });
    produtoId = produto.body.id;
  });

  it('cria pedido, baixa estoque e gera pontos', async () => {
    const response = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ itens: [{ produtoId, quantidade: 2, precoUnitario: 15 }] });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.total).toBe(30);
    expect(response.body.pontosGanhos).toBe(3);
    expect(response.body.status).toBe('RECEBIDO');
  });

  it('bloqueia pedido quando o estoque é insuficiente', async () => {
    const response = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ itens: [{ produtoId, quantidade: 9999, precoUnitario: 15 }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Estoque insuficiente');
  });

  it('lista e busca pedidos autenticados', async () => {
    const listagem = await request(app)
      .get('/api/pedidos')
      .set('Authorization', `Bearer ${token}`);

    expect(listagem.status).toBe(200);
    expect(listagem.body[0]).toHaveProperty('itens');

    const pedidoId = listagem.body[0].id;
    const busca = await request(app)
      .get(`/api/pedidos/${pedidoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(busca.status).toBe(200);
    expect(busca.body.id).toBe(pedidoId);
  });

  it('cancela pedido e estorna estoque e pontos', async () => {
    const created = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ itens: [{ produtoId, quantidade: 1, precoUnitario: 15 }] });

    const response = await request(app)
      .patch(`/api/pedidos/${created.body.id}/cancelamento`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: created.body.id, status: 'CANCELADO' });
  });
});const request = require('supertest');
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
    expect(response.body).toHaveProperty('clienteId', 10);
    expect(response.body.total).toBeCloseTo(11.98);
    expect(response.body.status).toBe('RECEBIDO');
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

describe('GET /api/pedidos', () => {
  it('lista os pedidos cadastrados com seus itens', async () => {
    const response = await request(app).get('/api/pedidos');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty('itens');
  });

  it('busca um pedido pelo identificador', async () => {
    const created = await request(app)
      .post('/api/pedidos')
      .send({ clienteId: 20, itens: [{ produto: 'Milho', quantidade: 1, precoUnitario: 8 }] });

    const response = await request(app).get(`/api/pedidos/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', created.body.id);
    expect(response.body.itens[0].produto).toBe('Milho');
  });

  it('retorna 404 para pedido inexistente', async () => {
    const response = await request(app).get('/api/pedidos/999999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Pedido não encontrado.');
  });

  it('cancela um pedido que ainda está recebido', async () => {
    const created = await request(app)
      .post('/api/pedidos')
      .send({ clienteId: 30, itens: [{ produto: 'Farinha', quantidade: 1, precoUnitario: 7.5 }] });

    const response = await request(app)
      .patch(`/api/pedidos/${created.body.id}/cancelamento`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: created.body.id, status: 'CANCELADO' });
  });
});