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
        function inserirPedido(error) {
          if (error) {
            db.close();
            return reject(error);
          }

          const pedidoId = this.lastID;
          const statement = db.prepare(
            'INSERT INTO itens_pedido (pedidoId, produto, quantidade, precoUnitario) VALUES (?, ?, ?, ?)'
          );

          itens.forEach((item) => {
            statement.run(pedidoId, item.produto, item.quantidade, item.precoUnitario);
          });

          statement.finalize((finalizeError) => {
            db.close();
            if (finalizeError) return reject(finalizeError);
            return resolve(pedidoId);
          });
        }
      );
    });
  }
}

module.exports = Pedido;