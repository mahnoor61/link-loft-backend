const User = require('../models/user');
const {success_response, error_response} = require('../utils/response');
const jwt = require('jsonwebtoken');
exports.signIn_with_google = async (req, res) => {
    try {
        let {email, username, emailVerified, signup_method, profile_photo, profile_name} = req.body;
        if (!email) {
            return error_response(res, 400, 'Email is required');
        }
        email = String(email).toLowerCase();
        if (!signup_method) signup_method = 'google';
        const checkUser = await User.findOne({email});
        if (checkUser) {
            // Update username if not set yet and a username is provided
            if (!checkUser.username && username) {
                checkUser.username = username;
            }
            // Update profile photo if not set
            if (!checkUser.profile_photo && profile_photo) {
                checkUser.profile_photo = profile_photo;
            }
            // Record signup method and email verification state
            if (signup_method) checkUser.signup_method = signup_method;
            if (typeof emailVerified === 'boolean') {
                checkUser.is_verified = emailVerified;
            }
            if (profile_name && !checkUser.profile_name) {
                checkUser.profile_name = profile_name;
            }
            const payload = {user_id: checkUser._id, user_email: checkUser.email}
            const jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
                expiresIn: process.env.TOKEN_EXPIRE
            });
            await checkUser.save();
            return success_response(res, 200, "User login successfully", { user: checkUser, token: jwtToken });
        }
        const newUser = await User.create({
            signup_method,
            email,
            username: username,
            is_verified: !!emailVerified,
            profile_photo: profile_photo || '',
            profile_name: profile_name || username
        });
        const payload = {user_id: newUser._id, user_email: newUser.email}
        const jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
            expiresIn: process.env.TOKEN_EXPIRE
        })
        await newUser.save();
        return success_response(res, 200, "User login successfully", { user: newUser, token: jwtToken });
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
}