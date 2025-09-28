const userRecord = require('../models/user_record');

exports.get_record = async (userId) => {
    let record = await userRecord.findOne({userId});
    if (!record) {
        record = await userRecord.create({
            userId
        });

        record = record.toObject()
        record.isNew = 1;
    }
    return record
};
