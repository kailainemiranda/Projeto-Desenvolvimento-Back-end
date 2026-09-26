const express = require('express');
const PedidoController = require('../controllers/PedidoController');

const router = express.Router();

router.post('/', PedidoController.criarPedido);
router.get('/', PedidoController.listarPedidos);
router.get('/:id', PedidoController.buscarPedidoPorId);
router.patch('/:id/cancelamento', PedidoController.cancelarPedido);

module.exports = router;