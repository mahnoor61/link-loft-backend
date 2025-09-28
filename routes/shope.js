const express = require('express');
const router = express.Router();
const {get_all_coins, buy_coins} = require('../controllers/shope');
const middleware = require('../middleware/user');

router.post('/buy', middleware, buy_coins);

module.exports = router;