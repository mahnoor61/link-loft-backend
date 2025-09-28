const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

require('dotenv').config();
require('./database/connection').connect();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
const apiRoutes = require('./routes/index');

const CORS_OPTIONS = process.env.CORS_OPTIONS;


let corsOrigins = [];

if (CORS_OPTIONS) {
    corsOrigins = CORS_OPTIONS.split(',').map(origin => origin.trim());
}

const corsOptions = {
    origin: corsOrigins, // Allow all origins if none specified
    optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

// Base URL of every route
app.use("/api", apiRoutes);

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

module.exports = app;
