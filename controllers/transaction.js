const Transaction = require('../models/transaction');
const User = require('../models/user');
const UserRecord = require('../models/user_record');
const {success_response, error_response} = require('../utils/response');
const {send_email} = require('../utils/transactionEmail');

exports.create_transaction = async (req, res) => {
    try {

        const userId = req.user.user_id;
        const {data, idr, coins, name, transaction_id, euro, card, status} = req.body;

        if (!(data && idr && coins && name && transaction_id && euro && card && status)) {
            return error_response(res, 400, "All inputs are required!");
        }

        //format name
        const capitalizeFirstLetter = (word) => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        };
        //formate the name
        const split = name.split(' ');
        let firstName = '';
        let lastName = '';

        if (split.length > 0) {
            firstName = capitalizeFirstLetter(split[0]);
        }

        if (split.length > 1) {
            lastName = capitalizeFirstLetter(split[split.length - 1]);
        }

        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        const roundedIdr = Number(idr).toFixed(2);
        const formattedIdr = Number(parseInt(roundedIdr, 10)).toLocaleString();
        const record = await Transaction.create({
            user_id: userId,
            idr,
            euro,
            card,
            coins,
            status,
            is_success: status === 'success' || status === 'Paid' ? true : false,
            name: fullName,
            transaction_id,
            data,
            time: new Date()
        });

        const user = await User.findOne({_id: userId});
        user.username = fullName;
        await user.save();

        if (status === 'success' || status === 'Paid') {
            const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;
            await send_email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, user.email, formattedIdr, euro, coins, transaction_id, fullName, status);
        }

        return success_response(res, 200, "Data created successfully", record);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

exports.get_all_transactions = async (req, res) => {
    try {
        const {user_id} = req.user;
        const transactionHistory = await Transaction.find({user_id}).populate('user_id', 'email').sort({time: -1});
        if (transactionHistory.length > 0) {
            return success_response(res, 200, "Fetch Transaction history of a user", transactionHistory);

        }
        return error_response(res, 400, "Purchase history not found")
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};

exports.remove_transaction = async (req, res) => {
    try {
        const {id} = req.params;

        // Find the transaction by ID
        const deleteTransaction = await Transaction.findOne({_id: id});

        if (deleteTransaction) {
            const coins = deleteTransaction.coins;
            const user_id = deleteTransaction.user_id;

            // Find the user's record
            const userRecord = await UserRecord.findOne({userId: user_id});

            if (userRecord) {
                // Update the user's TotalCoins and Gems
                userRecord.data.TotalCoins -= coins;
                userRecord.data.Gems -= coins;

                // Save the updated user record
                userRecord.markModified('data');
                await userRecord.save();

                // Now delete the transaction
                await Transaction.findOneAndDelete({_id: id});

                return success_response(res, 200, "Transaction deleted successfully", deleteTransaction);
            } else {
                return error_response(res, 400, "User record not found");
            }
        } else {
            return error_response(res, 400, "Transaction not found");
        }
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};


