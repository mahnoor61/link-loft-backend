const Admin = require('../models/admin');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const UserReord = require('../models/user_record');
const {success_response, error_response} = require('../utils/response');
const jwt = require('jsonwebtoken');
const Temp = require('../models/temp_user');
const {v4: uuidv4} = require('uuid');
const {send_email} = require('../utils/email');
const {send_email: email} = require('../utils/transactionEmail');
//2factor authentication
const speakeasy = require('speakeasy');


// login with 6 digit code like opt
exports.login = async (req, res) => {
    try {

        const {email} = req.body;
        if (!email) {
            return error_response(res, 400, "Email is  required!");
        }
        const checkAdmin = await Admin.findOne({email});
        if (checkAdmin) {
            await Temp.deleteMany({email});

            const secret = speakeasy.generateSecret({
                length: 6,
                name: 'Wendy_Crash_admin'
            });

            const code = speakeasy.totp({
                secret: secret.base32,
                encoding: 'base32'
            });

            const admin = await Temp.create({
                email: email.toLowerCase(),
                unique_id: uuidv4(),
                code,
            });

            const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;

            await send_email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, email, code);

            return success_response(res, 200, "Verification code successfully sent to the Admin", {unique_id: admin.unique_id});
        }
        return error_response(res, 400, "You are not an Admin");


    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.login_verification = async (req, res) => {
    try {

        const {code, unique_id} = req.body;
        const verifyAdmin = await Temp.findOne({code, unique_id});
        if (!verifyAdmin) {
            return error_response(res, 400, "Invalid code");
        }

        const adminEmail = verifyAdmin.email;
        const admin = await Admin.findOne({email: adminEmail});
        if (admin) {
            payload = {admin_email: admin.email, admin_id: admin._id}
            jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
                expiresIn: process.env.TOKEN_EXPIRE
            })

            // admin.token = jwtToken;
            // await admin.save();
            await Temp.deleteOne({code, unique_id});
            return success_response(res, 200, "Admin login successfully", {admin, token: jwtToken});
        }


    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.auth = async (req, res) => {
    try {
        const adminId = req.admin.admin_id;

        const admin = await Admin.findById({_id: adminId});

        if (!admin) {
            return error_response(res, 400, "Admin not found!");
        }
        return success_response(res, 200, "Auth successfully found", admin);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.get_all_transactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('user_id', 'email').sort({time: -1});
        const transactionAndRecord = [];

        for (const userData of transactions) {
            const userId = userData?.user_id?._id; // Safely access user_id and _id
            if (!userId) {
                transactionAndRecord.push({
                    transactionData: userData,
                    userRecord: null // No user record if user_id is null
                });
                continue;
            }

            const data = await UserReord.findOne({userId: userId});
            transactionAndRecord.push({
                transactionData: userData,
                userRecord: data
            });
        }

        return success_response(res, 200, "All transactions fetched successfully", transactionAndRecord);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};


// function ExcelDateToJSDate(serial) {
//     var utc_days = Math.floor(serial - 25569);
//     var utc_value = utc_days * 86400;
//     var date_info = new Date(utc_value * 1000);
//
//     var fractional_day = serial - Math.floor(serial) + 0.0000001;
//
//     var total_seconds = Math.floor(86400 * fractional_day);
//
//     var seconds = total_seconds % 60;
//
//     total_seconds -= seconds;
//
//     var hours = Math.floor(total_seconds / (60 * 60));
//     var minutes = Math.floor(total_seconds / 60) % 60;
//
//     return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
// }

// time function to format excel date into js date with am pm
function ExcelDateToJSDate(serial) {
    // Check if the input is a number (Excel serial number)
    if (!isNaN(serial)) {
        var utc_days = Math.floor(serial - 25569);
        var utc_value = utc_days * 86400;
        var date_info = new Date(utc_value * 1000);

        var fractional_day = serial - Math.floor(serial) + 0.0000001;
        var total_seconds = Math.floor(86400 * fractional_day);

        var seconds = total_seconds % 60;
        total_seconds -= seconds;

        var hours = Math.floor(total_seconds / (60 * 60));
        var minutes = Math.floor(total_seconds / 60) % 60;

        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    } else {
        // Handle string date input, clean invalid formats
        let cleanedDate = serial;

        // Remove AM/PM marker if the time is in 24-hour format
        if (serial.match(/\b\d{2}:\d{2}:\d{2}\b/) && serial.match(/\b(AM|PM)\b/i)) {
            cleanedDate = serial.replace(/\s?(AM|PM)\b/i, ''); // Remove AM/PM marker
        }

        // Attempt to parse the cleaned date
        var parsedDate = new Date(cleanedDate);
        if (isNaN(parsedDate)) {
            console.error("Invalid Date format for input:", serial);
            return null;
        }
        return parsedDate;
    }
}


exports.upload_file = async (req, res) => {
    try {

        const {data: jsonData} = req.body;

        if (jsonData.length > 0) {
            let userTransactions = [];

            for (const data of jsonData) {
                const sendingEmailResponse = data['Sending Email'];
                const userEmail = data['Bill Email'];
                const coins = parseInt(data['Coin ID'], 10) || 0;
                let user = await User.findOne({email: userEmail});
                let record;

                if (!user) {
                    user = await User.create({email: userEmail});
                    await UserReord.create({
                        userId: user._id,
                        data: {
                            OpenLevel: 0,
                            ReachedLevel: 0,
                            Gems: coins || 0,
                            UsedGems: 0,
                            TotalCoins: coins || 0,
                            ExtraMoves: 0,
                            FreeMove: 0,
                            MultiColorCandy: 0,
                            Stripe: 0,
                            Marmalade: 0,
                            Bomb: 0,
                            ExplodeArea: 0,
                            Music: 0,
                            Sound: 0,
                            Level1Star: 0,
                            Level2Star: 0,
                            Level3Star: 0,
                            Level4Star: 0,
                            Level5Star: 0,
                            Level6Star: 0,
                            Level7Star: 0,
                            Level8Star: 0,
                            Level9Star: 0,
                            Level10Star: 0,
                            Level11Star: 0,
                            Level12Star: 0,
                            Level13Star: 0,
                            Level14Star: 0,
                            Level15Star: 0,
                            Level16Star: 0,
                            Level17Star: 0,
                            Level18Star: 0,
                            Level19Star: 0,
                            Level20Star: 0,
                            Level21Star: 0,
                            Level22Star: 0,
                            Level23Star: 0,
                            Level24Star: 0,
                            Level25Star: 0,
                            Level26Star: 0,
                            Level27Star: 0,
                            Level28Star: 0,
                            Level29Star: 0,
                            Level30Star: 0,
                            Level31Star: 0,
                            Level32Star: 0,
                            Level33Star: 0,
                            Level34Star: 0,
                            Level35Star: 0,
                            Level36Star: 0,
                            Level37Star: 0,
                            Level38Star: 0,
                            Level39Star: 0,
                            Level40Star: 0,
                            Level41Star: 0,
                            Level42Star: 0,
                            Level43Star: 0,
                            Level44Star: 0,
                            Level45Star: 0,
                            Level46Star: 0,
                            Level47Star: 0,
                            Level48Star: 0,
                            Level49Star: 0,
                            Level50Star: 0,
                            Level51Star: 0,
                            Level52Star: 0,
                            Level53Star: 0,
                            Level54Star: 0,
                            Level55Star: 0,
                            Level56Star: 0,
                            Level57Star: 0,
                            Level58Star: 0,
                            Level59Star: 0,
                            Level60Star: 0,
                            Level61Star: 0,
                            Level62Star: 0,
                            Level63Star: 0,
                            Level64Star: 0,
                            Level65Star: 0,
                            Level66Star: 0,
                            Level67Star: 0,
                            Level68Star: 0,
                            Level69Star: 0,
                            Level70Star: 0,
                            Level71Star: 0,
                            Level72Star: 0,
                            Level73Star: 0,
                            Level74Star: 0,
                            Level75Star: 0,
                            Level76Star: 0,
                            Level77Star: 0,
                            Level78Star: 0,
                            Level79Star: 0,
                            Level80Star: 0,
                            Level81Star: 0,
                            Level82Star: 0,
                            Level83Star: 0,
                            Level84Star: 0,
                            Level85Star: 0,
                            Level86Star: 0,
                            Level87Star: 0,
                            Level88Star: 0,
                            Level89Star: 0,
                            Level90Star: 0,
                            Level91Star: 0,
                            Level92Star: 0,
                            Level93Star: 0,
                            Level94Star: 0,
                            Level95Star: 0,
                            Level96Star: 0,
                            Level97Star: 0,
                            Level98Star: 0,
                            Level99Star: 0,
                            Level100Star: 0,
                            Level101Star: 0,
                            Level102Star: 0,
                            Level103Star: 0,
                            Level104Star: 0,
                            Level105Star: 0,
                            Level106Star: 0,
                            Level107Star: 0,
                            Level108Star: 0,
                            Level109Star: 0,
                            Level110Star: 0,
                            Level111Star: 0,
                            Level112Star: 0,
                            Level113Star: 0,
                            Level114Star: 0,
                            Level115Star: 0,
                            Level116Star: 0,
                            Level117Star: 0,
                            Level118Star: 0,
                            Level119Star: 0,
                            Level120Star: 0,
                            Level121Star: 0,
                            Level122Star: 0,
                            Level123Star: 0,
                            Level124Star: 0,
                            Level125Star: 0,
                            Level126Star: 0,
                            Level127Star: 0,
                            Level128Star: 0,
                            Level129Star: 0,
                            Level130Star: 0,
                            Level131Star: 0,
                            Level132Star: 0,
                            Level133Star: 0,
                            Level134Star: 0,
                            Level135Star: 0,
                            Level136Star: 0,
                            Level137Star: 0,
                            Level138Star: 0,
                            Level139Star: 0,
                            Level140Star: 0,
                            Level141Star: 0,
                            Level142Star: 0,
                            Level143Star: 0,
                            Level144Star: 0,
                            Level145Star: 0,
                            Level146Star: 0,
                            Level147Star: 0,
                            Level148Star: 0,
                            Level149Star: 0,
                            Level150Star: 0,
                            Level151Star: 0,
                            Level152Star: 0,
                            Level153Star: 0,
                            Level154Star: 0,
                            Level155Star: 0,
                            Level156Star: 0,
                            Level157Star: 0,
                            Level158Star: 0,
                            Level159Star: 0,
                            Level160Star: 0,
                            Level161Star: 0,
                            Level162Star: 0,
                            Level163Star: 0,
                            Level164Star: 0,
                            Level165Star: 0,
                            Level166Star: 0,
                            Level167Star: 0,
                            Level168Star: 0,
                            Level1Score: 0,
                            Level2Score: 0,
                            Level3Score: 0,
                            Level4Score: 0,
                            Level5Score: 0,
                            Level6Score: 0,
                            Level7Score: 0,
                            Level8Score: 0,
                            Level9Score: 0,
                            Level10Score: 0,
                            Level11Score: 0,
                            Level12Score: 0,
                            Level13Score: 0,
                            Level14Score: 0,
                            Level15Score: 0,
                            Level16Score: 0,
                            Level17Score: 0,
                            Level18Score: 0,
                            Level19Score: 0,
                            Level20Score: 0,
                            Level21Score: 0,
                            Level22Score: 0,
                            Level23Score: 0,
                            Level24Score: 0,
                            Level25Score: 0,
                            Level26Score: 0,
                            Level27Score: 0,
                            Level28Score: 0,
                            Level29Score: 0,
                            Level30Score: 0,
                            Level31Score: 0,
                            Level32Score: 0,
                            Level33Score: 0,
                            Level34Score: 0,
                            Level35Score: 0,
                            Level36Score: 0,
                            Level37Score: 0,
                            Level38Score: 0,
                            Level39Score: 0,
                            Level40Score: 0,
                            Level41Score: 0,
                            Level42Score: 0,
                            Level43Score: 0,
                            Level44Score: 0,
                            Level45Score: 0,
                            Level46Score: 0,
                            Level47Score: 0,
                            Level48Score: 0,
                            Level49Score: 0,
                            Level50Score: 0,
                            Level51Score: 0,
                            Level52Score: 0,
                            Level53Score: 0,
                            Level54Score: 0,
                            Level55Score: 0,
                            Level56Score: 0,
                            Level57Score: 0,
                            Level58Score: 0,
                            Level59Score: 0,
                            Level60Score: 0,
                            Level61Score: 0,
                            Level62Score: 0,
                            Level63Score: 0,
                            Level64Score: 0,
                            Level65Score: 0,
                            Level66Score: 0,
                            Level67Score: 0,
                            Level68Score: 0,
                            Level69Score: 0,
                            Level70Score: 0,
                            Level71Score: 0,
                            Level72Score: 0,
                            Level73Score: 0,
                            Level74Score: 0,
                            Level75Score: 0,
                            Level76Score: 0,
                            Level77Score: 0,
                            Level78Score: 0,
                            Level79Score: 0,
                            Level80Score: 0,
                            Level81Score: 0,
                            Level82Score: 0,
                            Level83Score: 0,
                            Level84Score: 0,
                            Level85Score: 0,
                            Level86Score: 0,
                            Level87Score: 0,
                            Level88Score: 0,
                            Level89Score: 0,
                            Level90Score: 0,
                            Level91Score: 0,
                            Level92Score: 0,
                            Level93Score: 0,
                            Level94Score: 0,
                            Level95Score: 0,
                            Level96Score: 0,
                            Level97Score: 0,
                            Level98Score: 0,
                            Level99Score: 0,
                            Level100Score: 0,
                            Level101Score: 0,
                            Level102Score: 0,
                            Level103Score: 0,
                            Level104Score: 0,
                            Level105Score: 0,
                            Level106Score: 0,
                            Level107Score: 0,
                            Level108Score: 0,
                            Level109Score: 0,
                            Level110Score: 0,
                            Level111Score: 0,
                            Level112Score: 0,
                            Level113Score: 0,
                            Level114Score: 0,
                            Level115Score: 0,
                            Level116Score: 0,
                            Level117Score: 0,
                            Level118Score: 0,
                            Level119Score: 0,
                            Level120Score: 0,
                            Level121Score: 0,
                            Level122Score: 0,
                            Level123Score: 0,
                            Level124Score: 0,
                            Level125Score: 0,
                            Level126Score: 0,
                            Level127Score: 0,
                            Level128Score: 0,
                            Level129Score: 0,
                            Level130Score: 0,
                            Level131Score: 0,
                            Level132Score: 0,
                            Level133Score: 0,
                            Level134Score: 0,
                            Level135Score: 0,
                            Level136Score: 0,
                            Level137Score: 0,
                            Level138Score: 0,
                            Level139Score: 0,
                            Level140Score: 0,
                            Level141Score: 0,
                            Level142Score: 0,
                            Level143Score: 0,
                            Level144Score: 0,
                            Level145Score: 0,
                            Level146Score: 0,
                            Level147Score: 0,
                            Level148Score: 0,
                            Level149Score: 0,
                            Level150Score: 0,
                            Level151Score: 0,
                            Level152Score: 0,
                            Level153Score: 0,
                            Level154Score: 0,
                            Level155Score: 0,
                            Level156Score: 0,
                            Level157Score: 0,
                            Level158Score: 0,
                            Level159Score: 0,
                            Level160Score: 0,
                            Level161Score: 0,
                            Level162Score: 0,
                            Level163Score: 0,
                            Level164Score: 0,
                            Level165Score: 0,
                            Level166Score: 0,
                            Level167Score: 0,
                            Level168Score: 0
                        }
                    });
                } else {
                    // Find existing user record
                    record = await UserReord.findOne({userId: user._id});
                    if (record) {
                        // Update existing record with new transaction coins
                        record.data.Gems += coins;
                        record.data.TotalCoins += coins;
                        await record.markModified('data');
                        await record.save();
                    } else {
                        record = await UserReord.create({
                            userId: user._id,
                            data: {
                                OpenLevel: 0,
                                ReachedLevel: 0,
                                Gems: coins || 0,
                                UsedGems: 0,
                                TotalCoins: coins || 0,
                                ExtraMoves: 0,
                                FreeMove: 0,
                                MultiColorCandy: 0,
                                Stripe: 0,
                                Marmalade: 0,
                                Bomb: 0,
                                ExplodeArea: 0,
                                Music: 0,
                                Sound: 0,
                                Level1Star: 0,
                                Level2Star: 0,
                                Level3Star: 0,
                                Level4Star: 0,
                                Level5Star: 0,
                                Level6Star: 0,
                                Level7Star: 0,
                                Level8Star: 0,
                                Level9Star: 0,
                                Level10Star: 0,
                                Level11Star: 0,
                                Level12Star: 0,
                                Level13Star: 0,
                                Level14Star: 0,
                                Level15Star: 0,
                                Level16Star: 0,
                                Level17Star: 0,
                                Level18Star: 0,
                                Level19Star: 0,
                                Level20Star: 0,
                                Level21Star: 0,
                                Level22Star: 0,
                                Level23Star: 0,
                                Level24Star: 0,
                                Level25Star: 0,
                                Level26Star: 0,
                                Level27Star: 0,
                                Level28Star: 0,
                                Level29Star: 0,
                                Level30Star: 0,
                                Level31Star: 0,
                                Level32Star: 0,
                                Level33Star: 0,
                                Level34Star: 0,
                                Level35Star: 0,
                                Level36Star: 0,
                                Level37Star: 0,
                                Level38Star: 0,
                                Level39Star: 0,
                                Level40Star: 0,
                                Level41Star: 0,
                                Level42Star: 0,
                                Level43Star: 0,
                                Level44Star: 0,
                                Level45Star: 0,
                                Level46Star: 0,
                                Level47Star: 0,
                                Level48Star: 0,
                                Level49Star: 0,
                                Level50Star: 0,
                                Level51Star: 0,
                                Level52Star: 0,
                                Level53Star: 0,
                                Level54Star: 0,
                                Level55Star: 0,
                                Level56Star: 0,
                                Level57Star: 0,
                                Level58Star: 0,
                                Level59Star: 0,
                                Level60Star: 0,
                                Level61Star: 0,
                                Level62Star: 0,
                                Level63Star: 0,
                                Level64Star: 0,
                                Level65Star: 0,
                                Level66Star: 0,
                                Level67Star: 0,
                                Level68Star: 0,
                                Level69Star: 0,
                                Level70Star: 0,
                                Level71Star: 0,
                                Level72Star: 0,
                                Level73Star: 0,
                                Level74Star: 0,
                                Level75Star: 0,
                                Level76Star: 0,
                                Level77Star: 0,
                                Level78Star: 0,
                                Level79Star: 0,
                                Level80Star: 0,
                                Level81Star: 0,
                                Level82Star: 0,
                                Level83Star: 0,
                                Level84Star: 0,
                                Level85Star: 0,
                                Level86Star: 0,
                                Level87Star: 0,
                                Level88Star: 0,
                                Level89Star: 0,
                                Level90Star: 0,
                                Level91Star: 0,
                                Level92Star: 0,
                                Level93Star: 0,
                                Level94Star: 0,
                                Level95Star: 0,
                                Level96Star: 0,
                                Level97Star: 0,
                                Level98Star: 0,
                                Level99Star: 0,
                                Level100Star: 0,
                                Level101Star: 0,
                                Level102Star: 0,
                                Level103Star: 0,
                                Level104Star: 0,
                                Level105Star: 0,
                                Level106Star: 0,
                                Level107Star: 0,
                                Level108Star: 0,
                                Level109Star: 0,
                                Level110Star: 0,
                                Level111Star: 0,
                                Level112Star: 0,
                                Level113Star: 0,
                                Level114Star: 0,
                                Level115Star: 0,
                                Level116Star: 0,
                                Level117Star: 0,
                                Level118Star: 0,
                                Level119Star: 0,
                                Level120Star: 0,
                                Level121Star: 0,
                                Level122Star: 0,
                                Level123Star: 0,
                                Level124Star: 0,
                                Level125Star: 0,
                                Level126Star: 0,
                                Level127Star: 0,
                                Level128Star: 0,
                                Level129Star: 0,
                                Level130Star: 0,
                                Level131Star: 0,
                                Level132Star: 0,
                                Level133Star: 0,
                                Level134Star: 0,
                                Level135Star: 0,
                                Level136Star: 0,
                                Level137Star: 0,
                                Level138Star: 0,
                                Level139Star: 0,
                                Level140Star: 0,
                                Level141Star: 0,
                                Level142Star: 0,
                                Level143Star: 0,
                                Level144Star: 0,
                                Level145Star: 0,
                                Level146Star: 0,
                                Level147Star: 0,
                                Level148Star: 0,
                                Level149Star: 0,
                                Level150Star: 0,
                                Level151Star: 0,
                                Level152Star: 0,
                                Level153Star: 0,
                                Level154Star: 0,
                                Level155Star: 0,
                                Level156Star: 0,
                                Level157Star: 0,
                                Level158Star: 0,
                                Level159Star: 0,
                                Level160Star: 0,
                                Level161Star: 0,
                                Level162Star: 0,
                                Level163Star: 0,
                                Level164Star: 0,
                                Level165Star: 0,
                                Level166Star: 0,
                                Level167Star: 0,
                                Level168Star: 0,
                                Level1Score: 0,
                                Level2Score: 0,
                                Level3Score: 0,
                                Level4Score: 0,
                                Level5Score: 0,
                                Level6Score: 0,
                                Level7Score: 0,
                                Level8Score: 0,
                                Level9Score: 0,
                                Level10Score: 0,
                                Level11Score: 0,
                                Level12Score: 0,
                                Level13Score: 0,
                                Level14Score: 0,
                                Level15Score: 0,
                                Level16Score: 0,
                                Level17Score: 0,
                                Level18Score: 0,
                                Level19Score: 0,
                                Level20Score: 0,
                                Level21Score: 0,
                                Level22Score: 0,
                                Level23Score: 0,
                                Level24Score: 0,
                                Level25Score: 0,
                                Level26Score: 0,
                                Level27Score: 0,
                                Level28Score: 0,
                                Level29Score: 0,
                                Level30Score: 0,
                                Level31Score: 0,
                                Level32Score: 0,
                                Level33Score: 0,
                                Level34Score: 0,
                                Level35Score: 0,
                                Level36Score: 0,
                                Level37Score: 0,
                                Level38Score: 0,
                                Level39Score: 0,
                                Level40Score: 0,
                                Level41Score: 0,
                                Level42Score: 0,
                                Level43Score: 0,
                                Level44Score: 0,
                                Level45Score: 0,
                                Level46Score: 0,
                                Level47Score: 0,
                                Level48Score: 0,
                                Level49Score: 0,
                                Level50Score: 0,
                                Level51Score: 0,
                                Level52Score: 0,
                                Level53Score: 0,
                                Level54Score: 0,
                                Level55Score: 0,
                                Level56Score: 0,
                                Level57Score: 0,
                                Level58Score: 0,
                                Level59Score: 0,
                                Level60Score: 0,
                                Level61Score: 0,
                                Level62Score: 0,
                                Level63Score: 0,
                                Level64Score: 0,
                                Level65Score: 0,
                                Level66Score: 0,
                                Level67Score: 0,
                                Level68Score: 0,
                                Level69Score: 0,
                                Level70Score: 0,
                                Level71Score: 0,
                                Level72Score: 0,
                                Level73Score: 0,
                                Level74Score: 0,
                                Level75Score: 0,
                                Level76Score: 0,
                                Level77Score: 0,
                                Level78Score: 0,
                                Level79Score: 0,
                                Level80Score: 0,
                                Level81Score: 0,
                                Level82Score: 0,
                                Level83Score: 0,
                                Level84Score: 0,
                                Level85Score: 0,
                                Level86Score: 0,
                                Level87Score: 0,
                                Level88Score: 0,
                                Level89Score: 0,
                                Level90Score: 0,
                                Level91Score: 0,
                                Level92Score: 0,
                                Level93Score: 0,
                                Level94Score: 0,
                                Level95Score: 0,
                                Level96Score: 0,
                                Level97Score: 0,
                                Level98Score: 0,
                                Level99Score: 0,
                                Level100Score: 0,
                                Level101Score: 0,
                                Level102Score: 0,
                                Level103Score: 0,
                                Level104Score: 0,
                                Level105Score: 0,
                                Level106Score: 0,
                                Level107Score: 0,
                                Level108Score: 0,
                                Level109Score: 0,
                                Level110Score: 0,
                                Level111Score: 0,
                                Level112Score: 0,
                                Level113Score: 0,
                                Level114Score: 0,
                                Level115Score: 0,
                                Level116Score: 0,
                                Level117Score: 0,
                                Level118Score: 0,
                                Level119Score: 0,
                                Level120Score: 0,
                                Level121Score: 0,
                                Level122Score: 0,
                                Level123Score: 0,
                                Level124Score: 0,
                                Level125Score: 0,
                                Level126Score: 0,
                                Level127Score: 0,
                                Level128Score: 0,
                                Level129Score: 0,
                                Level130Score: 0,
                                Level131Score: 0,
                                Level132Score: 0,
                                Level133Score: 0,
                                Level134Score: 0,
                                Level135Score: 0,
                                Level136Score: 0,
                                Level137Score: 0,
                                Level138Score: 0,
                                Level139Score: 0,
                                Level140Score: 0,
                                Level141Score: 0,
                                Level142Score: 0,
                                Level143Score: 0,
                                Level144Score: 0,
                                Level145Score: 0,
                                Level146Score: 0,
                                Level147Score: 0,
                                Level148Score: 0,
                                Level149Score: 0,
                                Level150Score: 0,
                                Level151Score: 0,
                                Level152Score: 0,
                                Level153Score: 0,
                                Level154Score: 0,
                                Level155Score: 0,
                                Level156Score: 0,
                                Level157Score: 0,
                                Level158Score: 0,
                                Level159Score: 0,
                                Level160Score: 0,
                                Level161Score: 0,
                                Level162Score: 0,
                                Level163Score: 0,
                                Level164Score: 0,
                                Level165Score: 0,
                                Level166Score: 0,
                                Level167Score: 0,
                                Level168Score: 0
                            }
                        });

                    }
                }
                // const idr = data['IDR'];
                // const euro = data['EUR'];
                // const splitIdr = data['IDR'].split(" ")[1];
                // const cleanSplit = splitIdr.replace(/,/g, '');
                // const idrValue = parseInt(cleanSplit);
                //
                // const splitEur = data['EUR'].split(" ")[1];
                // const cleanSplitEur = splitEur.replace(/,/g, '');
                // const euroValue = parseInt(cleanSplitEur);
                const card = data['Card'];
                // const time = (new Date((new Date(data['Paid Date']).getTime() - 25569 * 86400 * 1000)).toISOString());
                const time = ExcelDateToJSDate(data['Paid Date']);

                const transaction_id = data['Transaction Id'];
                const status = data['Status'];

                const transactionIdStr = String(transaction_id);
                const numericId = transactionIdStr.replace(/\D/g, '');
                const prefix = 'WCRS';
                const firstThree = numericId.slice(0, 3);
                const nextFive = numericId.slice(3, 8);
                const nextTwo = numericId.slice(8, 10);
                const remaining = numericId.slice(10);
                const formattedId = `${prefix}${firstThree}-${nextFive}-${nextTwo}`;
                const completeId = formattedId + remaining;

                const capitalizeFirstLetter = (word) => {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                };

                const split = data['Bill Name'].split(' ');
                let firstName = '';
                let lastName = '';

                if (split.length > 0) {
                    firstName = capitalizeFirstLetter(split[0]);
                }

                if (split.length > 1) {
                    lastName = capitalizeFirstLetter(split[split.length - 1]);
                }

                const fullName = lastName ? `${firstName} ${lastName}` : firstName;
                user.username = fullName;
                await user.save();
                const checkTransactionExist = await Transaction.findOne({
                    transaction_id: completeId,
                    user_id: user._id
                });
                //if transaction id already exist update its record otherwise create it
                if (checkTransactionExist) {
                    checkTransactionExist.is_success = status === 'Paid';
                    checkTransactionExist.name = fullName;
                    checkTransactionExist.coins = data['Coin ID'];
                    checkTransactionExist.card = card;
                    checkTransactionExist.euro = data['EUR'];
                    checkTransactionExist.idr = data['IDR'];
                    checkTransactionExist.status = status;
                    checkTransactionExist.time = time;
                    checkTransactionExist.data = data;
                    await checkTransactionExist.save();

                    userTransactions.push(checkTransactionExist);
                    if ((status === 'success' || status === 'Paid') && sendingEmailResponse === 'Yes') {
                        const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;
                        await email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, userEmail, data['IDR'],
                            data['EUR'], data['Coin ID'], completeId, fullName, status
                        );
                    }
                } else {
                    const transaction = await Transaction.create({
                        user_id: user._id,
                        is_success: status === 'Paid',
                        transaction_id: completeId,
                        name: fullName,
                        coins: data['Coin ID'],
                        card,
                        euro: data['EUR'],
                        idr: data['IDR'],
                        status,
                        time,
                        data
                    });

                    userTransactions.push(transaction);
                    if ((status === 'success' || status === 'Paid') && sendingEmailResponse === 'Yes') {
                        const {MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME} = process.env;
                        await email(MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, userEmail, data['IDR'],
                            data['EUR'], data['Coin ID'], completeId, fullName, status
                        );
                    }
                }
            }
            return res.status(200).json({
                message: "Transactions created successfully",
                transactions: userTransactions
            });

        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: 'An error occurred while processing the file'});
    }
};
exports.update_level = async (req, res) => {
    try {
        const {id} = req.params;
        const {level, score} = req.body;
        if (!id) {
            return error_response(res, 400, "Id is required to update level");
        }

        const userRecord = await UserReord.findById({_id: id});
        if (userRecord) {
            userRecord.data.OpenLevel = level;
            userRecord.data.ReachedLevel = level;

            // Update stars and scores for levels up to the selected level
            for (let i = 1; i < level; i++) {
                userRecord.data[`Level${i}Star`] = level;
                userRecord.data[`Level${i}Score`] = score;
            }

            // // Get the maximum level present in the user record
            const levelKeys = Object.keys(userRecord.data).filter(key => key.startsWith('Level') && key.endsWith('Star'));
            const maxLevel = Math.max(...levelKeys.map(key => parseInt(key.match(/\d+/)[0])));

            // Reset stars and scores for levels beyond the selected level
            for (let i = level; i <= maxLevel; i++) {
                userRecord.data[`Level${i}Star`] = 0;
                userRecord.data[`Level${i}Score`] = 0;
            }

            userRecord.markModified('data');
            await userRecord.save();
        }

        return success_response(res, 200, "Level updated successfully", userRecord);
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.login_into_user_panel = async (req, res) => {
    try {
        const {id} = req.params;
        const user = await User.findOne({_id: id});
        if (user) {
            let payload = {user_email: user.email, user_id: user._id}
            let jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
                expiresIn: '10m'
            });
            return success_response(res, 200, "User token created successfully", jwtToken);
        }
        return error_response(res, 400, "User not found!");
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.update_email = async (req, res) => {
    try {

        const adminId = req.admin.admin_id;
        const {email} = req.body;

        if (!email) {
            return error_response(res, 400, "Email is required to update it!");
        }

        const admin = await Admin.findOne({_id: adminId});

        if (admin) {
            admin.email = email;
            await admin.save();
            return success_response(res, 200, "Email updated successfully", admin);
        }
        return error_response(res, 400, "Admin not found!");
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.get_admin_info = async (req, res) => {
    try {
        const adminId = req.admin.admin_id;
        const admin = await Admin.findOne({_id: adminId});

        if (admin) {
            return success_response(res, 200, "Admin info get successfully", admin);
        }
        return error_response(res, 400, "Admin not found");
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.get_all_users = async (req, res) => {
    try {
        let usersWithRecord = [];
        const users = await User.find();

        if (users.length > 0) {
            usersWithRecord = await Promise.all(
                users.map(async (user) => {
                    const userId = user._id;
                    const usersRecord = await UserReord.findOne({userId});

                    return {
                        user,
                        record: usersRecord || null,
                    };
                })
            );
        }

        return success_response(res, 200, "All users with their records get successfully", usersWithRecord);

    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
};
exports.refund_coins = async (req, res) => {
    try {
        let {purchasedCoins, usedCoins} = req.body;
        const {id} = req.params;
        // Convert negative values to positive, but keep 0 as 0
        purchasedCoins = purchasedCoins < 0 ? Math.abs(purchasedCoins) : purchasedCoins;
        usedCoins = usedCoins < 0 ? Math.abs(usedCoins) : usedCoins;

        if (purchasedCoins === undefined || usedCoins === undefined) {
            return error_response(res, 400, "All inputs are required!");
        }
        const userRecord = await UserReord.findOne({_id: id});
        if (userRecord) {
            userRecord.data.UsedGems = usedCoins;
            userRecord.data.Gems = purchasedCoins - usedCoins;
            userRecord.data.TotalCoins = purchasedCoins;
            userRecord.markModified('data');
            await userRecord.save();
            return success_response(res, 200, "Coins updated successfully", userRecord);
        }
        return error_response(res, 400, "User record not found!");
    } catch (error) {
        console.log(error);
        return error_response(res, 400, error.message);
    }
};

exports.get_user_transactions_count = async (req, res) => {
    try {
        const {userId} = req.params;
        if (!userId) {
            return error_response(res, 400, "user id is required!");
        }
        const userTransactrions = await Transaction.find({user_id: userId});
        if (userTransactrions) {
            const count = userTransactrions.length;
            return success_response(res, 200, "User transaction count fetch successfully", count);
        }

    } catch (error) {
        console.log(error);
        return error_response(res, 400, error.message);
    }
};

exports.get_transaction = async (req, res) => {
    try {
        const {transactionId} = req.params;
        if (!transactionId) {
            return error_response(res, 400, 'Id is required!');
        }
        const findTransaction = await Transaction.findOne({
            transaction_id: transactionId
        });

        if (findTransaction) {
            const userId = findTransaction.user_id;
            const user = await User.findOne({_id: userId});
            const userRecord = await UserReord.findOne({userId});
            const userEmail = user?.email;
            return success_response(res, 200, "Transaction  fetch successfully", {
                transaction: findTransaction,
                email: userEmail,
                record: userRecord
            });
        }
        return error_response(res, 400, "Transaction not found!");
    } catch (error) {
        console.log(error);
        return error_response(res, 500, error.message);
    }
}
