const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');
const secret = () => process.env.JWT_SECRET || 'chave_secreta_raizes_nordeste';

function abrirBanco() {
  return new sqlite3.Database(dbPath);
}

exports.register = async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha || senha.length < 6) {
    return res.status(400).json({ error: 'Nome, e-mail e senha com pelo menos 6 caracteres são obrigatórios.' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 8);
    const db = abrirBanco();
    db.run(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash],
      function inserirUsuario(error) {
        if (error) {
          db.close();
          return res.status(409).json({ error: 'E-mail já cadastrado.' });
        }

        const usuarioId = this.lastID;
        db.run('INSERT INTO fidelidade (usuario_id, saldo_pontos) VALUES (?, 0)', [usuarioId], () => {
          db.close();
          return res.status(201).json({ id: usuarioId, nome, email });
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.login = (req, res) => {
  const { email, senha } = req.body;
  const db = abrirBanco();

  db.get('SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?', [email], async (error, usuario) => {
    if (error || !usuario) {
      db.close();
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const senhaValida = await bcrypt.compare(senha || '', usuario.senha_hash);
    db.close();
    if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, secret(), { expiresIn: '1d' });
    return res.json({ user: { id: usuario.id, nome: usuario.nome, email: usuario.email }, token });
  });
};