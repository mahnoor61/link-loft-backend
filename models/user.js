const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {type: String},
    username: {type: String},
    profile_name: {type: String},
    password: {type: String},
    profile_photo: {type: String},
    is_verified: {type: Boolean, default: false},
    signup_method:{type: String},
    // token: {type: String},
}, {timestamps: true});

module.exports = mongoose.model("user", userSchema);