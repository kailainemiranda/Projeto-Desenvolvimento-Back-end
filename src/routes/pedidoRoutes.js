const express = require('express');
const PedidoController = require('../controllers/PedidoController');

const router = express.Router();

router.post('/', PedidoController.criarPedido);

module.exports = router;