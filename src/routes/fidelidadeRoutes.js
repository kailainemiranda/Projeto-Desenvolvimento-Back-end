const express = require('express');
const FidelidadeController = require('../controllers/FidelidadeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/saldo', FidelidadeController.obterSaldo);
router.post('/resgatar', FidelidadeController.resgatarPontos);

module.exports = router;
