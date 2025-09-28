const {success_response, error_response} = require('../utils/response');
const {get_record} = require('../utils/get_record');
const Record = require('../models/user_record');

exports.update_data = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const {data} = req.body;

        let record = await get_record(userId);

        if (record) {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    let value = data[key];
                    value = Math.max(0, value);
                    record.data[key] = value;
                }
            }
            record.markModified('data');
            await record.save();

            return success_response(res, 200, "Data updated successfully", record);
        } else {
            return error_response(res, 404, "Record not found");
        }
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

exports.get_data = async (req, res) => {
    try {
        const userId = req.user.user_id;
        let record = await get_record(userId);

        if (record) {
            return success_response(res, 200, "Data get successfully", record);
        }

    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.set_data = async (req, res) => {
    const userId = req.user.user_id;
    const {data} = req.body;


    if (!data) {
        return error_response(res, 400, "Data is required!");
    }
    const checkUser = await Record.findOne({userId});
    if (checkUser) {
        checkUser.data = data;
        await checkUser.save();
    }
    return success_response(res, 200, "Data set successfully", checkUser);
};

