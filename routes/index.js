const express = require('express');
const app = express();

const User = require('./user');
const userRecord = require('./user_record');
const Coins = require('./shope');
const LoginWithGoogle = require('./login_with_google');
const Transaction = require('./transaction');
const Admin = require('./admin');

app.use('/user', User);
app.use('/user/record', userRecord);
app.use('/coins', Coins);
app.use('/signin-with', LoginWithGoogle);
app.use('/transaction', Transaction);
app.use('/admin', Admin);

module.exports = app;