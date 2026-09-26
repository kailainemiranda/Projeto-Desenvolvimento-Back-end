const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pedidos', require('./routes/pedidoRoutes'));
app.use('/api/estoque', require('./routes/estoqueRoutes'));
app.use('/api/fidelidade', require('./routes/fidelidadeRoutes'));

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
  res.status(500).json({ error: error.message });
});

module.exports = app;