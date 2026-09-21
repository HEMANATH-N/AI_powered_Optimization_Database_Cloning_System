const File = require('../models/File');
const { optimizeFile } = require('../services/optimization.service');
const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let fileType = 'document';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) fileType = 'image';
    else if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) fileType = 'video';
    else if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) fileType = 'audio';
    else if (['.pdf'].includes(ext)) fileType = 'pdf';
    else if (['.zip', '.rar', '.tar', '.gz'].includes(ext)) fileType = 'archive';

    const { optimizedSize, compressionPercent } = optimizeFile(size);

    const file = await File.create({
      fileName: filename,
      originalName: originalname,
      fileType,
      mimeType: mimetype,
      size,
      optimizedSize,
      compressionPercent,
      isOptimized: true,
      filePath: filePath.replace(/\\/g, '/'),
      userId: req.user._id
    });

    res.status(201).json({ success: true, message: 'File uploaded and optimized', file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const files = await File.find({ userId: req.user._id, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFileById = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    await File.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
    res.json({ success: true, message: 'File moved to recycle bin' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.viewFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false })
      .catch(() => File.findOne({ _id: req.params.id, userId: req.user._id }));
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const absolutePath = path.resolve(file.filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // inline = browser tries to display it; attachment = forces download
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(absolutePath).size);
    // Allow same-origin iframes to embed the file
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    fs.createReadStream(absolutePath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const absolutePath = path.resolve(file.filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(absolutePath).size);
    fs.createReadStream(absolutePath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

