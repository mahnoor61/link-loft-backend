const mongoose = require('mongoose');
// const {MONGO_URL} = process.env;

exports.connect = () => {
    mongoose.connect(process.env.MONGO_URL, {
        // console.log('process.env.MONGO_URL', process.env.MONGO_URL);
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log('Database connected successfully');
    }).catch((error) => {
        console.log('Database connection failed');
        console.error(error.message);
        process.exit(1);
    })

}