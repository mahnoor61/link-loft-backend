const {success_response, error_response} = require('../utils/response');
const {get_record} = require('../utils/get_record');

exports.buy_coins = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const {coins} = req.body;

        let record = await get_record(userId);

        let userGems = record.data.Gems;
        let userCoins = record.data.TotalCoins;

        if (userCoins && userGems) {
            const totalGems = userGems + coins;
            const totalCoins = userCoins + coins;

            record.data.Gems = totalGems;
            record.data.TotalCoins = totalCoins;

            record.markModified('data');
            await record.save();

            return success_response(res, 200, "Coins modified successfully", record);
        }
        record.data.Gems = coins;
        record.data.TotalCoins = coins;
        record.markModified('data');
        await record.save();
        return success_response(res, 200, "Coins purchased successfully", record);

    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};