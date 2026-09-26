const express = require('express');
const EstoqueController = require('../controllers/EstoqueController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/produtos', EstoqueController.criarProduto);
router.post('/movimentar', EstoqueController.movimentarEstoque);

module.exports = router;
