const nodemailer = require('nodemailer');
const APP_URL = process.env.APP_URL;
const { generateEmailTemplate } = require('./emailTemplate');

exports.send_email = async (MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT, MAIL_FROM, APP_NAME, email, idr, euro, coins, transaction_id, fullName, status) => {
    const formitIdr = idr.toLocaleString();

    let transport = nodemailer.createTransport({
        host: MAIL_HOST,
        port: MAIL_PORT,
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS
        }
    });

    const subject = `Coin Delivery | ${transaction_id} - ${status === 'success' || status === 'Paid' ? "Transaction Successful" : "Transaction Unsuccessful"}`;
    const body = `
      <p>Dear ${fullName},</p>
      <p>Your Wendy Crash Coin Purchase was <b>${(status === 'success' || status === 'Paid') ? 'Successful' : 'Unsuccessful'}</b>.</p>
      <p>Below are the details of your Purchase:</p>
      <ul>
        <li><b>Coins Purchased:</b> ${coins}</li>
        <li><b>Status:</b> ${(status === 'success' || status === 'Paid') ? 'Delivered' : 'Not Delivered'}</li>
        <li><b>Transaction ID:</b> ${transaction_id}</li>
      </ul>
      <p><a class="button" href="${APP_URL}/view?transactionId=${transaction_id}">View Purchase Details</a></p>
      <p><b>Transaction Amount</b><br/>EUR: ${euro}<br/>IDR: ${formitIdr}</p>
    `;

    const mailOptions = {
        from: `"${APP_NAME}" <${MAIL_FROM}>`,
        to: email,
        subject: subject,
        html: generateEmailTemplate(APP_NAME, subject, body)
    };


    await transport.sendMail(mailOptions, (error, info) => {

        if (error) {
            console.error('Error:', error);
            throw new Error('Email not sent!');
        } else {
            console.log('Email sent:', info.response);
        }
    });

};


