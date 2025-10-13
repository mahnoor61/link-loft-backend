const User = require('../models/user');
const UserRecord = require('../models/user_record');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const speakeasy = require('speakeasy');
const bcrypt = require('bcryptjs');
const {success_response, error_response} = require('../utils/response');
const TempUser = require('../models/temp_user');

const {send_email} = require('../utils/email');

// Register user with username, email, password, profile photo, send OTP
exports.register = async (req, res) => {
    try {
        const {username, email, password} = req.body;
        const file = req.file;

        if (!(username && email && password)) {
            return error_response(res, 400, "All inputs are required!");
        }

        const normalizedEmail = String(email).toLowerCase();
        let existingUser = await User.findOne({email: normalizedEmail});
        if (existingUser && existingUser.is_verified) {
            return error_response(res, 400, "User already exists. Please login.");
        }

        // Create or update a pending (unverified) user record
        const hashedPassword = await bcrypt.hash(password, 10);

        let profilePhotoPath = '';
        if (file) {
            profilePhotoPath = `/uploads/profiles/${file.filename}`;
        }

        if (existingUser && !existingUser.is_verified) {
            // Update pending user details if provided
            existingUser.username = username || existingUser.username;
            existingUser.password = hashedPassword || existingUser.password;
            existingUser.profile_photo = profilePhotoPath || existingUser.profile_photo;
            await existingUser.save();
        } else if (!existingUser) {
            existingUser = await User.create({
                email: normalizedEmail,
                username,
                password: hashedPassword,
                signup_method: 'manual',
                profile_photo: profilePhotoPath,
                is_verified: false
            });
        }

        // Always refresh OTP for registration attempts
        await TempUser.deleteMany({email: normalizedEmail, type: 'register'});

        const secret = speakeasy.generateSecret({
            length: 6,
            name: 'Wendy_Crash_Register'
        });

        const code = speakeasy.totp({
            secret: secret.base32,
            encoding: 'base32'
        });

        const temp = await TempUser.create({
            email: normalizedEmail,
            unique_id: uuidv4(),
            code,
            username: existingUser.username,
            password: existingUser.password,
            profile_photo: existingUser.profile_photo,
            type: 'register'
        });

        const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;
        const body = `Your verification code is: <b>${code}</b>`;
        await send_email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, normalizedEmail, body, 'Verify your account');

        const message = existingUser && !existingUser.is_verified
            ? 'Account exists but not verified. We sent a new code. Please verify to complete registration.'
            : 'Verification code sent to your email';

        return success_response(res, 200, message, {unique_id: temp.unique_id});
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

// Verify OTP and create the user
exports.verify_registration = async (req, res) => {
    try {
        const {code, unique_id} = req.body;
        if (!(code && unique_id)) {
            return error_response(res, 400, "Code and unique_id are required!");
        }
        const temp = await TempUser.findOne({code, unique_id, type: 'register'});
        if (!temp) {
            return error_response(res, 400, "Invalid code");
        }

        const normalizedEmail = String(temp.email).toLowerCase();
        let user = await User.findOne({email: normalizedEmail});
        if (user) {
            user.username = temp.username || user.username;
            user.password = temp.password || user.password;
            user.profile_photo = temp.profile_photo || user.profile_photo;
            user.is_verified = true;
            await user.save();
        } else {
            user = await User.create({
                email: normalizedEmail,
                username: temp.username,
                signup_method: 'manual',
                password: temp.password,
                profile_photo: temp.profile_photo,
                is_verified: true
            });
        }

        let payload = {user_email: user.email, user_id: user._id}
        let jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
            expiresIn: process.env.TOKEN_EXPIRE
        })
        await TempUser.deleteMany({code, unique_id, type: 'register'});
        return success_response(res, 200, "Registration verified successfully", {user, token: jwtToken});
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

// Login with email and password
exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!(email && password)) {
            return error_response(res, 400, "Email and password are required!");
        }
        const normalizedEmail = String(email).toLowerCase();
        const user = await User.findOne({email: normalizedEmail});
        if (!user) {
            return error_response(res, 404, "User does not exist. Please register.");
        }
        if (!user.is_verified) {
            return error_response(res, 400, "Please verify your email before logging in");
        }
        // If the user signed up with Google and has not set a password yet, ask them to set it first
        if (user.signup_method === 'google' && !user.password) {
            return error_response(res, 400, "Please set your password");
        }
        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
            return error_response(res, 400, "Invalid email or password");
        }
        let payload = {user_email: user.email, user_id: user._id}
        let jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
            expiresIn: process.env.TOKEN_EXPIRE
        })
        return success_response(res, 200, "User login successfully", {user, token: jwtToken});
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

// Auth and profile info endpoints remain
exports.auth = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const user = await User.findById({_id: userId});

        if (!user) {
            return error_response(res, 400, "User not found!");
        }
        return success_response(res, 200, "Auth successfully found", user);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.get_user_info = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const UserInfo = await User.findOne({_id: userId});
        if (UserInfo) {
            const userData = await UserRecord.findOne({userId});

            return success_response(res, 200, "User detail get successfully", {user: UserInfo, userData});
        }

    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

// Forgot password: send OTP to email
exports.forgot_password = async (req, res) => {
    try {
        const {email} = req.body;
        if (!email) {
            return error_response(res, 400, "Email is required!");
        }
        const normalizedEmail = String(email).toLowerCase();
        const user = await User.findOne({email: normalizedEmail});
        if (!user) {
            return error_response(res, 404, "User does not exist. Please register.");
        }
        if (!user.is_verified) {
            return error_response(res, 400, "Please verify your email before resetting password");
        }

        await TempUser.deleteMany({email: normalizedEmail, type: 'forgot'});

        const secret = speakeasy.generateSecret({length: 6, name: 'Wendy_Crash_Forgot'});
        const code = speakeasy.totp({secret: secret.base32, encoding: 'base32'});

        const temp = await TempUser.create({
            email: normalizedEmail,
            unique_id: uuidv4(),
            code,
            type: 'forgot'
        });

        const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;
        const body = `Your password reset code is: <b>${code}</b>`;
        await send_email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, normalizedEmail, body, 'Reset your password');

        return success_response(res, 200, "Password reset code sent to your email", {unique_id: temp.unique_id});
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

// Reset password: verify code and set new password
exports.reset_password = async (req, res) => {
    try {
        const {code, unique_id, new_password} = req.body;
        if (!(code && unique_id && new_password)) {
            return error_response(res, 400, "Code, unique_id and new_password are required!");
        }

        const temp = await TempUser.findOne({code, unique_id, type: 'forgot'});
        if (!temp) {
            return error_response(res, 400, "Invalid code");
        }

        const normalizedEmail = String(temp.email).toLowerCase();
        const user = await User.findOne({email: normalizedEmail});
        if (!user) {
            return error_response(res, 404, "User does not exist. Please register.");
        }

        const hashed = await bcrypt.hash(new_password, 10);
        user.password = hashed;
        await user.save();

        await TempUser.deleteMany({email: normalizedEmail, type: 'forgot'});

        return success_response(res, 200, "Password reset successfully. Please login.");
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};