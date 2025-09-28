const User = require('../models/user');
const {success_response, error_response} = require('../utils/response');
const jwt = require('jsonwebtoken');
exports.signIn_with_google = async (req, res) => {
    try {
        const {email} = req.body;
        const checkUser = await User.findOne({email});
        if (checkUser) {
            const payload = {user_id: checkUser._id, user_email: checkUser.email}
            const jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
                expiresIn: process.env.TOKEN_EXPIRE
            });
            checkUser.token = jwtToken;
            await checkUser.save();
            return success_response(res, 200, "User login successfully", checkUser);
        }
        const newUser = await User.create({
            email
        });
        const payload = {user_id: newUser._id, user_email: newUser.email}
        const jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
            expiresIn: process.env.TOKEN_EXPIRE
        })
        newUser.token = jwtToken;
        await newUser.save();
        return success_response(res, 200, "User login successfully", newUser);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
}