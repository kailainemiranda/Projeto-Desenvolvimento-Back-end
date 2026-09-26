const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

exports.movimentarEstoque = (req, res) => {
  const { produtoId, quantidade, tipo } = req.body;

  if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade <= 0
    || !['ENTRADA', 'SAIDA'].includes(tipo)) {
    return res.status(400).json({ error: 'produtoId, quantidade e tipo válidos são obrigatórios.' });
  }

  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.get('SELECT estoque_quantidade FROM produtos WHERE id = ?', [produtoId], (error, produto) => {
      if (error) {
        db.close();
        return res.status(500).json({ error: error.message });
      }
      if (!produto) {
        db.close();
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      if (tipo === 'SAIDA' && produto.estoque_quantidade < quantidade) {
        db.close();
        return res.status(400).json({ error: 'Estoque insuficiente.' });
      }

      const novaQuantidade = tipo === 'ENTRADA'
        ? produto.estoque_quantidade + quantidade
        : produto.estoque_quantidade - quantidade;

      db.run('UPDATE produtos SET estoque_quantidade = ? WHERE id = ?', [novaQuantidade, produtoId], (updateError) => {
        if (updateError) {
          db.close();
          return res.status(500).json({ error: updateError.message });
        }

        db.run(
          'INSERT INTO movimentacoes_estoque (produto_id, quantidade, tipo, usuario_id) VALUES (?, ?, ?, ?)',
          [produtoId, quantidade, tipo, req.user.id],
          (historyError) => {
            db.close();
            if (historyError) return res.status(500).json({ error: historyError.message });
            return res.json({ produtoId, tipo, novoEstoque: novaQuantidade });
          }
        );
      });
    });
  });
};

exports.criarProduto = (req, res) => {
  const { nome, preco, estoqueQuantidade = 0 } = req.body;

  if (!nome || !Number.isFinite(preco) || preco <= 0 || !Number.isInteger(estoqueQuantidade) || estoqueQuantidade < 0) {
    return res.status(400).json({ error: 'Nome, preço e estoque inicial válidos são obrigatórios.' });
  }

  const db = new sqlite3.Database(dbPath);
  db.run(
    'INSERT INTO produtos (nome, preco, estoque_quantidade) VALUES (?, ?, ?)',
    [nome, preco, estoqueQuantidade],
    function inserirProduto(error) {
      db.close();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ id: this.lastID, nome, preco, estoqueQuantidade });
    }
  );
};
