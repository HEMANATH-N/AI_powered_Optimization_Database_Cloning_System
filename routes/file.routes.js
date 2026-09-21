const express = require('express');
const router = express.Router();
const { uploadFile, getFiles, getFileById, deleteFile, downloadFile, viewFile } = require('../controllers/file.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.get('/:id/view', protect, viewFile);
router.get('/:id/download', protect, downloadFile);
router.get('/:id', protect, getFileById);
router.delete('/:id', protect, deleteFile);

module.exports = router;


