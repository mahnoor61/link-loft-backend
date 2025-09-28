exports.success_response = async (res, statusCode = 200, msg, data = {}) => {
    return res.status(statusCode).json({success: true, msg, data})
};
exports.error_response = async (res, statusCode = 400, msg, data = {}) => {
    return res.status(statusCode).json({success: false, msg, data})
}