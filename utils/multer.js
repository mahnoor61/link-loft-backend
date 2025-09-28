const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadMiddleware = (subfolder = 'transaction') => {

    const destination = path.join(__dirname, `../public/uploads/${subfolder}`);

    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, {recursive: true});
    }

    const storage = multer.diskStorage({
        destination,
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        },
    });

    return multer({storage})
}


module.exports = {uploadMiddleware};