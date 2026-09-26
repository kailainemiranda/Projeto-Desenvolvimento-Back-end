const Pedido = require('../models/Pedido');

exports.criarPedido = async (req, res) => {
  try {
    const { clienteId, itens } = req.body;

    if (!clienteId || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos ou lista de itens vazia.' });
    }

    const itemInvalido = itens.some(
      (item) => !item.produto
        || !Number.isFinite(item.quantidade)
        || item.quantidade <= 0
        || !Number.isFinite(item.precoUnitario)
        || item.precoUnitario <= 0
    );

    if (itemInvalido) {
      return res.status(400).json({ error: 'Itens do pedido contêm valores inválidos.' });
    }

    const total = itens.reduce(
      (sum, item) => sum + item.precoUnitario * item.quantidade,
      0
    );

    const pedidoId = await Pedido.criar(clienteId, total, itens);

    return res.status(201).json({ id: pedidoId, total });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};