const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

function abrirBanco() {
  return new sqlite3.Database(dbPath);
}

exports.obterSaldo = (req, res) => {
  const db = abrirBanco();
  db.get('SELECT saldo_pontos FROM fidelidade WHERE usuario_id = ?', [req.user.id], (error, row) => {
    db.close();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ usuarioId: req.user.id, saldoPontos: row ? row.saldo_pontos : 0 });
  });
};

exports.resgatarPontos = (req, res) => {
  const { pontosResgate } = req.body;
  if (!Number.isInteger(pontosResgate) || pontosResgate <= 0) {
    return res.status(400).json({ error: 'Quantidade de pontos inválida.' });
  }

  const db = abrirBanco();
  db.serialize(() => {
    db.get('SELECT saldo_pontos FROM fidelidade WHERE usuario_id = ?', [req.user.id], (error, row) => {
      if (error) {
        db.close();
        return res.status(500).json({ error: error.message });
      }
      if (!row) {
        db.close();
        return res.status(404).json({ error: 'Conta de fidelidade não encontrada.' });
      }
      if (row.saldo_pontos < pontosResgate) {
        db.close();
        return res.status(400).json({ error: 'Saldo de pontos insuficiente.' });
      }

      const novoSaldo = row.saldo_pontos - pontosResgate;
      db.run('UPDATE fidelidade SET saldo_pontos = ? WHERE usuario_id = ?', [novoSaldo, req.user.id], (updateError) => {
        if (updateError) {
          db.close();
          return res.status(500).json({ error: updateError.message });
        }
        db.run(
          "INSERT INTO historico_fidelidade (usuario_id, pontos, tipo, descricao) VALUES (?, ?, 'RESGATE', ?)",
          [req.user.id, pontosResgate, 'Resgate de pontos'],
          (historyError) => {
            db.close();
            if (historyError) return res.status(500).json({ error: historyError.message });
            return res.json({ mensagem: 'Resgate efetuado com sucesso.', novoSaldo });
          }
        );
      });
    });
  });
};
