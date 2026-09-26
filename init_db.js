const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'RECEBIDO',
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
  `);

  db.run(`ALTER TABLE pedidos ADD COLUMN status TEXT NOT NULL DEFAULT 'RECEBIDO'`, (error) => {
    if (error && !error.message.includes('duplicate column name')) {
      console.error('Erro ao atualizar a tabela pedidos:', error.message);
    }
  });

  console.log('Banco de dados inicializado com sucesso.');
});

db.close();