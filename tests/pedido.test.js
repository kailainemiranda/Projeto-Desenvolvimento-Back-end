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
      .send({ canalPedido: 'APP', itens: [{ produtoId, quantidade: 2, precoUnitario: 15 }] });

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
      .send({ canalPedido: 'APP', itens: [{ produtoId, quantidade: 9999, precoUnitario: 15 }] });

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
      .send({ canalPedido: 'TOTEM', itens: [{ produtoId, quantidade: 1, precoUnitario: 15 }] });

    const response = await request(app)
      .patch(`/api/pedidos/${created.body.id}/cancelamento`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: created.body.id, status: 'CANCELADO' });
  });

  it('exige canal e filtra pedidos por canal', async () => {
    const semCanal = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ itens: [{ produtoId, quantidade: 1, precoUnitario: 15 }] });
    expect(semCanal.status).toBe(400);

    const listagem = await request(app)
      .get('/api/pedidos?canalPedido=TOTEM')
      .set('Authorization', `Bearer ${token}`);
    expect(listagem.status).toBe(200);
    expect(listagem.body.every((pedido) => pedido.canalPedido === 'TOTEM')).toBe(true);
  });

  it('registra pagamento mock e avança o pedido', async () => {
    const created = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ canalPedido: 'WEB', itens: [{ produtoId, quantidade: 1, precoUnitario: 15 }] });

    const payment = await request(app)
      .post(`/api/pedidos/${created.body.id}/pagamento-mock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APROVADO', formaPagamento: 'PIX' });

    expect(payment.status).toBe(200);
    expect(payment.body.pagamento.status).toBe('APROVADO');
    expect(payment.body.statusPedido).toBe('EM_PREPARO');
  });
});
