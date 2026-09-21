const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, getAnalytics);

module.exports = router;
