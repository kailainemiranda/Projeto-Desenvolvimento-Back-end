const Pedido = require('../models/Pedido');

exports.criarPedidoIntegrado = async (req, res) => {
  try {
    const { itens } = req.body;
    const itensValidos = Array.isArray(itens) && itens.length > 0 && itens.every(
      (item) => Number.isInteger(item.produtoId)
        && Number.isInteger(item.quantidade)
        && item.quantidade > 0
        && Number.isFinite(item.precoUnitario)
        && item.precoUnitario > 0
    );

    if (!itensValidos) {
      return res.status(400).json({ error: 'O pedido deve conter itens válidos.' });
    }

    const pedido = await Pedido.criarIntegrado(req.user.id, itens);
    return res.status(201).json({
      ...pedido,
      mensagem: 'Pedido criado, estoque atualizado e pontos creditados.'
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

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

    const pedidoId = await Pedido.criar(clienteId, itens, total);

    return res.status(201).json({
      id: pedidoId,
      clienteId,
      total,
      status: 'RECEBIDO',
      mensagem: 'Pedido registrado na rede Raízes do Nordeste'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.listarTodos();
    return res.status(200).json(pedidos);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.buscarPedidoPorId = async (req, res) => {
  try {
    const pedido = await Pedido.buscarPorId(req.params.id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.cancelarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.cancelarComEstorno(req.params.id, req.user.id);
    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.atualizarPedido = async (req, res) => {
  const { status } = req.body;
  const statusPermitidos = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({ error: 'Status de pedido inválido.' });
  }

  try {
    const resultado = await Pedido.atualizarStatus(req.params.id, status);
    if (resultado === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    return res.json({ id: Number(req.params.id), status });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deletarPedido = async (req, res) => {
  try {
    const pedido = await Pedido.cancelarComEstorno(req.params.id, req.user.id);
    return res.json({ ...pedido, mensagem: 'Pedido cancelado e recursos estornados.' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};