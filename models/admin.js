const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    // name: {type: String},
    email: {type: String},
    // token: {type: String},
});

module.exports = mongoose.model('admin', adminSchema);