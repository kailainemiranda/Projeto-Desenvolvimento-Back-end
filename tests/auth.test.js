const request = require('supertest');
const app = require('../src/app');

describe('Autenticação e rotas protegidas', () => {
  const email = `kailaine-${Date.now()}@raizes.local`;

  it('cadastra um usuário e cria sua conta de fidelidade', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Kailaine', email, senha: 'segredo123' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(email);
  });

  it('faz login e retorna um token JWT', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'segredo123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('bloqueia consulta de fidelidade sem token', async () => {
    const response = await request(app).get('/api/fidelidade/saldo');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token não fornecido');
  });
});