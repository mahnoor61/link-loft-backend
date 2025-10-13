const LinkClick = require('../models/link_click');
const { success_response, error_response } = require('../utils/response');

// POST /api/links/click
// body: { linkKey: 'instagram' | 'youtube' | 'tiktok', clientId: string }
exports.record_click = async (req, res) => {
  try {
    const { linkKey, clientId } = req.body;
    if (!linkKey || !clientId) {
      return error_response(res, 400, 'linkKey and clientId are required');
    }
    const normalizedKey = String(linkKey).toLowerCase();

    // Attempt to create a unique record; if exists, it's already counted
    await LinkClick.updateOne(
      { linkKey: normalizedKey, clientId },
      { $setOnInsert: { linkKey: normalizedKey, clientId, userId: req.user?.user_id || null } },
      { upsert: true }
    );

    return success_response(res, 200, 'Click recorded');
  } catch (err) {
    // Duplicate key error means it already exists; still OK
    if (err.code === 11000) {
      return success_response(res, 200, 'Click already recorded for this client');
    }
    console.log(err);
    return error_response(res, 500, err.message);
  }
};

// GET /api/links/stats
exports.get_stats = async (req, res) => {
  try {
    const agg = await LinkClick.aggregate([
      { $group: { _id: '$linkKey', count: { $sum: 1 } } }
    ])
      .then((rows) => rows.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}));

    return success_response(res, 200, 'Stats fetched', agg);
  } catch (err) {
    console.log(err);
    return error_response(res, 500, err.message);
  }
};


