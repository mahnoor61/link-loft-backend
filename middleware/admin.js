const jwt = require('jsonwebtoken');
const config = process.env;
const {error_response} = require('../utils/response');
const admin_token_verify = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            return error_response(res, 400, "Token is required for authentication!");
        }

        const decode = jwt.verify(token, config.TOKEN_KEY);
        req.admin = decode;
        next();
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
}

module.exports = admin_token_verify;