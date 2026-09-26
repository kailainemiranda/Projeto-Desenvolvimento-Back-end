const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

function abrirBanco() {
  return new sqlite3.Database(dbPath);
}

function fecharBanco(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

function executar(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function executarSql(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function consultar(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

class Pedido {
  static criarIntegrado(usuarioId, itens) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();

      (async () => {
        try {
          await executar(db, 'BEGIN TRANSACTION');
          let total = 0;
          const itensPersistidos = [];

          for (const item of itens) {
            const produto = await consultar(
              db,
              'SELECT id, nome, estoque_quantidade FROM produtos WHERE id = ?',
              [item.produtoId]
            );

            if (!produto) {
              const error = new Error(`Produto ${item.produtoId} não encontrado.`);
              error.status = 404;
              throw error;
            }
            if (produto.estoque_quantidade < item.quantidade) {
              const error = new Error(`Estoque insuficiente para o produto ID ${item.produtoId}.`);
              error.status = 400;
              throw error;
            }

            total += item.precoUnitario * item.quantidade;
            itensPersistidos.push({
              produto: produto.nome,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario
            });

            await executar(
              db,
              'UPDATE produtos SET estoque_quantidade = estoque_quantidade - ? WHERE id = ?',
              [item.quantidade, item.produtoId]
            );
            await executar(
              db,
              "INSERT INTO movimentacoes_estoque (produto_id, quantidade, tipo, usuario_id) VALUES (?, ?, 'SAIDA', ?)",
              [item.produtoId, item.quantidade, usuarioId]
            );
          }

          const pedido = await executar(
            db,
            'INSERT INTO pedidos (clienteId, total, status) VALUES (?, ?, ?)',
            [usuarioId, total, 'RECEBIDO']
          );

          for (const item of itensPersistidos) {
            await executar(
              db,
              'INSERT INTO itens_pedido (pedidoId, produto, quantidade, precoUnitario) VALUES (?, ?, ?, ?)',
              [pedido.lastID, item.produto, item.quantidade, item.precoUnitario]
            );
          }

          const pontosGanhos = Math.floor(total / 10);
          if (pontosGanhos > 0) {
            await executar(
              db,
              'UPDATE fidelidade SET saldo_pontos = saldo_pontos + ? WHERE usuario_id = ?',
              [pontosGanhos, usuarioId]
            );
            await executar(
              db,
              "INSERT INTO historico_fidelidade (usuario_id, pontos, tipo, descricao) VALUES (?, ?, 'ACUMULO', ?)",
              [usuarioId, pontosGanhos, `Pontos do pedido #${pedido.lastID}`]
            );
          }

          await executar(db, 'COMMIT');
          await fecharBanco(db);
          resolve({ id: pedido.lastID, total, pontosGanhos, status: 'RECEBIDO' });
        } catch (error) {
          await executar(db, 'ROLLBACK').catch(() => {});
          await fecharBanco(db);
          reject(error);
        }
      })();
    });
  }

  static criar(clienteId, itens, total) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          'INSERT INTO pedidos (clienteId, total, status) VALUES (?, ?, ?)',
          [clienteId, total, 'RECEBIDO'],
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
        SELECT p.id AS pedidoId, p.clienteId, p.total, p.status, p.dataCriacao,
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
        SELECT p.id AS pedidoId, p.clienteId, p.total, p.status, p.dataCriacao,
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

  static atualizarStatus(id, status) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();
       db.run('UPDATE pedidos SET status = ? WHERE id = ?', [status, id], function atualizarStatus(error) {
        fecharBanco(db).then(() => {
          if (error) reject(error);
            else resolve(this.changes);
        });
      });
    });
  }

  static cancelarComEstorno(id, usuarioId) {
    return new Promise((resolve, reject) => {
      const db = abrirBanco();

      (async () => {
        try {
          await executar(db, 'BEGIN TRANSACTION');
          const pedido = await consultar(db, 'SELECT id, clienteId, total, status FROM pedidos WHERE id = ?', [id]);
          if (!pedido) {
            const error = new Error('Pedido não encontrado.');
            error.status = 404;
            throw error;
          }
          if (pedido.status !== 'RECEBIDO') {
            const error = new Error('Apenas pedidos recebidos podem ser cancelados.');
            error.status = 409;
            throw error;
          }

          const itens = await new Promise((resolveRows, rejectRows) => {
            db.all('SELECT produto, quantidade FROM itens_pedido WHERE pedidoId = ?', [id], (error, rows) => {
              if (error) rejectRows(error);
              else resolveRows(rows);
            });
          });

          for (const item of itens) {
            const produto = await consultar(db, 'SELECT id FROM produtos WHERE nome = ?', [item.produto]);
            if (produto) {
              await executar(db, 'UPDATE produtos SET estoque_quantidade = estoque_quantidade + ? WHERE id = ?', [item.quantidade, produto.id]);
              await executar(db, "INSERT INTO movimentacoes_estoque (produto_id, quantidade, tipo, usuario_id) VALUES (?, ?, 'ENTRADA', ?)", [produto.id, item.quantidade, usuarioId]);
            }
          }

          const pontos = Math.floor(pedido.total / 10);
          if (pontos > 0) {
            await executar(db, 'UPDATE fidelidade SET saldo_pontos = MAX(0, saldo_pontos - ?) WHERE usuario_id = ?', [pontos, pedido.clienteId]);
            await executar(db, "INSERT INTO historico_fidelidade (usuario_id, pontos, tipo, descricao) VALUES (?, ?, 'ESTORNO', ?)", [pedido.clienteId, pontos, `Estorno do pedido #${id}`]);
          }

          await executar(db, "UPDATE pedidos SET status = 'CANCELADO' WHERE id = ?", [id]);
          await executar(db, 'COMMIT');
          await fecharBanco(db);
          resolve({ id: Number(id), status: 'CANCELADO' });
        } catch (error) {
          await executar(db, 'ROLLBACK').catch(() => {});
          await fecharBanco(db);
          reject(error);
        }
      })();
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
          status: row.status,
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
