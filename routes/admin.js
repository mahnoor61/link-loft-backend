const express = require('express');
const router = express.Router();
const {
    login,
    login_verification,
    auth,
    get_all_transactions,
    upload_file,
    update_level,
    login_into_user_panel,
    update_email,
    get_admin_info,
    get_all_users,
    refund_coins,
    get_user_transactions_count,
    get_transaction
} = require('../controllers/admin');
const middleware = require('../middleware/admin');
const {uploadMiddleware} = require('../utils/multer');

router.post('/login', login);
router.post('/login-verification', login_verification);
router.get('/auth', middleware, auth);
router.get('/get-all-transactions', middleware, get_all_transactions);
router.get('/get-all-users/:id', middleware, login_into_user_panel);
router.post('/update-level/:id', middleware, update_level);
router.post('/upload-file', [middleware, uploadMiddleware().single('file')], upload_file);
router.post('/update-email', middleware, update_email);
router.get('/get-info', middleware, get_admin_info);
router.get('/get-all-users', middleware, get_all_users);
router.post('/refund-coins/:id', middleware, refund_coins);
router.get('/get-user-transaction-count/:userId', middleware, get_user_transactions_count);
router.get('/get-transaction/:transactionId', get_transaction);
module.exports = router;