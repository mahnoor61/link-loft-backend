const express = require('express');
const router = express();
const middleware = require('../middleware/user');
const {update_data, get_data, set_data} = require('../controllers/user_record');

router.post('/update-data', middleware, update_data);
router.get('/get-data', middleware, get_data);
router.post('/set-data', middleware, set_data);
module.exports = router;