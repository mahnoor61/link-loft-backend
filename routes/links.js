const express = require('express');
const router = express.Router();
const { record_click, get_stats } = require('../controllers/link_clicks');
const middleware = require('../middleware/user');

// Public endpoints: allow non-auth users to record clicks with a clientId
router.post('/click', record_click);

// Stats can be public, but you can protect if needed
router.get('/stats', get_stats);

module.exports = router;


