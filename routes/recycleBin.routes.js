const express = require('express');
const router = express.Router();
const { getRecycleBin, restoreFile, permanentDelete } = require('../controllers/recycleBin.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, getRecycleBin);
router.post('/restore/:id', protect, restoreFile);
router.delete('/permanent-delete/:id', protect, permanentDelete);

module.exports = router;
