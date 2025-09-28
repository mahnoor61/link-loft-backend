const express = require('express');
const router = express.Router();
const {signIn_with_google} = require('../controllers/login_with_google');


router.post('/google', signIn_with_google);
module.exports = router;