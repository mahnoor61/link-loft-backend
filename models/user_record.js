const mongoose = require('mongoose');

const userRecordSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
});
module.exports = mongoose.model('user_record', userRecordSchema);