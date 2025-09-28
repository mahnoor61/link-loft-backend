const express = require('express');
const router = express.Router();
const {create_transaction, get_all_transactions, remove_transaction} = require('../controllers/transaction');
const middleWare = require('../middleware/user');

// router.post('/create', middleWare, create_transaction);
router.post('/create', middleWare, create_transaction);
router.get('/get-all-history', middleWare, get_all_transactions);
router.delete('/remove/:id', middleWare, remove_transaction);


module.exports = router;