const express = require('express');
const router = express.Router();
const { startClone, resumeClone, pauseClone, getCloneStatus, getAllCloneJobs, deleteCloneJob, bulkDeleteCloneJobs } = require('../controllers/clone.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/start', protect, startClone);
router.post('/resume', protect, resumeClone);
router.post('/pause', protect, pauseClone);
router.get('/', protect, getAllCloneJobs);
router.get('/status/:id', protect, getCloneStatus);
router.delete('/bulk', protect, bulkDeleteCloneJobs);
router.delete('/:id', protect, deleteCloneJob);

module.exports = router;

