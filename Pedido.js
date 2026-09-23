const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

class Pedido {
  static criar(clienteId, total, itens) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);

      db.run(
        'INSERT INTO pedidos (clienteId, total) VALUES (?, ?)',
        [clienteId, total],
        function (err) {
          if (err) {
            db.close();
            return reject(err);
          }

          const pedidoId = this.lastID;
          const stmt = db.prepare(
            'INSERT INTO itens_pedido (pedidoId, produto, quantidade, precoUnitario) VALUES (?, ?, ?, ?)'
          );

          itens.forEach((item) => {
            stmt.run(pedidoId, item.produto, item.quantidade, item.precoUnitario);
          });

          stmt.finalize((errFinal) => {
            db.close();
            if (errFinal) return reject(errFinal);
            resolve(pedidoId);
          });
        }
      );
    });
  }
}

module.exports = Pedido;