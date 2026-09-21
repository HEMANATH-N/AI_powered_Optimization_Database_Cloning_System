const express = require('express');
const router = express.Router();
const { getDevices, removeDevice } = require('../controllers/device.controller');
const { protect } = require('../middlewares/auth.middleware');
const { trackDevice } = require('../middlewares/device.middleware');

router.get('/', protect, trackDevice, getDevices);
router.delete('/:id', protect, removeDevice);

module.exports = router;
