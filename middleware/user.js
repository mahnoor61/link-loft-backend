const jwt = require('jsonwebtoken');
const config = process.env;
const {success_response, error_response} = require('../utils/response');

const verify_token = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            return error_response(res, 400, "Token is required for authentication!")
        }
        const decode = jwt.verify(token, config.TOKEN_KEY);
        req.user = decode;
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
    return next();
};

module.exports = verify_token;