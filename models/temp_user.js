const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
    email: {type: String},
    code: {type: String},
    unique_id: {type: String},
    username: {type: String},
    password: {type: String},
    profile_photo: {type: String},
    type: {type: String} // e.g., 'register', 'login', 'admin-login'
}, {timestamps: true});

module.exports = mongoose.model("temp_user", tempUserSchema);