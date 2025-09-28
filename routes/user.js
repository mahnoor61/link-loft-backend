const express = require('express');
const router = express.Router();
const {
    register,
    verify_registration,
    login,
    auth,
    get_user_info,
    forgot_password,
    reset_password,
} = require('../controllers/user');
const middleware = require('../middleware/user');
const {uploadMiddleware} = require('../utils/multer');

// Registration and verification
router.post('/register', uploadMiddleware('profiles').single('profile_photo'), register);
router.post('/verify', verify_registration);
router.post('/forgot-password', forgot_password);
router.post('/reset-password', reset_password);

// Login with email/password
router.post('/login', login);

// Authenticated endpoints
router.get('/auth', middleware, auth);
router.get('/get-info', middleware, get_user_info);
module.exports = router;