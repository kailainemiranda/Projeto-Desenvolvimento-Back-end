const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

function abrirBanco() {
  return new sqlite3.Database(dbPath);
}

function fecharBanco(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

class Pedido {
  static criar(clienteId, itens, total) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          'INSERT INTO pedidos (clienteId, total) VALUES (?, ?)',
          [clienteId, total],
          function inserirPedido(error) {
            if (error) {
              db.run('ROLLBACK', () => fecharBanco(db).then(() => reject(error)));
              return;
            }

            const pedidoId = this.lastID;
            const statement = db.prepare(
              'INSERT INTO itens_pedido (pedidoId, produto, quantidade, precoUnitario) VALUES (?, ?, ?, ?)'
            );
            let itemError = null;

            itens.forEach((item) => {
              statement.run(
                pedidoId,
                item.produto,
                item.quantidade,
                item.precoUnitario,
                (errorItem) => {
                  if (errorItem) itemError = errorItem;
                }
              );
            });

            statement.finalize((finalizeError) => {
              const errorFinal = itemError || finalizeError;
              if (errorFinal) {
                db.run('ROLLBACK', () => fecharBanco(db).then(() => reject(errorFinal)));
                return;
              }

              db.run('COMMIT', (commitError) => {
                fecharBanco(db).then(() => {
                  if (commitError) {
                    reject(commitError);
                    return;
                  }
                  resolve(pedidoId);
                });
              });
            });
          }
        );
      });
    });
  }

  static listarTodos() {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();
      const query = `
        SELECT p.id AS pedidoId, p.clienteId, p.total, p.dataCriacao,
               i.id AS itemId, i.produto, i.quantidade, i.precoUnitario
        FROM pedidos p
        LEFT JOIN itens_pedido i ON p.id = i.pedidoId
        ORDER BY p.id DESC
      `;

      db.all(query, [], (error, rows) => {
        fecharBanco(db).then(() => {
          if (error) {
            reject(error);
            return;
          }
          resolve(Pedido.agruparResultados(rows));
        });
      });
    });
  }

  static buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();
      const query = `
        SELECT p.id AS pedidoId, p.clienteId, p.total, p.dataCriacao,
               i.id AS itemId, i.produto, i.quantidade, i.precoUnitario
        FROM pedidos p
        LEFT JOIN itens_pedido i ON p.id = i.pedidoId
        WHERE p.id = ?
      `;

      db.all(query, [id], (error, rows) => {
        fecharBanco(db).then(() => {
          if (error) {
            reject(error);
            return;
          }
          resolve(rows.length === 0 ? null : Pedido.agruparResultados(rows)[0]);
        });
      });
    });
  }

  static agruparResultados(rows) {
    const pedidos = new Map();

    rows.forEach((row) => {
      if (!pedidos.has(row.pedidoId)) {
        pedidos.set(row.pedidoId, {
          id: row.pedidoId,
          clienteId: row.clienteId,
          total: row.total,
          dataCriacao: row.dataCriacao,
          itens: []
        });
      }

      if (row.itemId) {
        pedidos.get(row.pedidoId).itens.push({
          id: row.itemId,
          produto: row.produto,
          quantidade: row.quantidade,
          precoUnitario: row.precoUnitario
        });
      }
    });

    return Array.from(pedidos.values());
  }
}

module.exports = Pedido;
