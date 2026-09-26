const express = require('express');
const PedidoController = require('../controllers/PedidoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, PedidoController.criarPedidoIntegrado);
router.get('/', PedidoController.listarPedidos);
router.get('/:id', PedidoController.buscarPedidoPorId);
router.patch('/:id/cancelamento', authMiddleware, PedidoController.cancelarPedido);
router.put('/:id', authMiddleware, PedidoController.atualizarPedido);
router.delete('/:id', authMiddleware, PedidoController.deletarPedido);

module.exports = router;