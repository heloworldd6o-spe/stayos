const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireAuth, enforceTenant } = require('../middleware/auth');
const { upload, uploadDir } = require('../services/storageService');
const { v4: uuidv4 } = require('uuid');

// POST /api/documents/upload (Upload resident or staff document)
router.post('/upload', requireAuth, enforceTenant, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    try {
      const { residentId, title, docType = 'other' } = req.body;
      const fileUrl = `/api/documents/file/${req.file.filename}`;

      if (residentId) {
        const docId = uuidv4();
        db.prepare(`
          INSERT INTO resident_documents (
            id, resident_id, title, doc_type, file_path, file_size, mime_type, uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          docId, residentId, title || req.file.originalname, docType,
          fileUrl, req.file.size, req.file.mimetype, req.user.full_name
        );
      }

      res.status(201).json({
        message: 'File uploaded successfully.',
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (dbErr) {
      res.status(500).json({ error: 'Failed to record document: ' + dbErr.message });
    }
  });
});

// GET /api/documents/file/:filename (Protected file delivery)
router.get('/file/:filename', requireAuth, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve file: ' + err.message });
  }
});

module.exports = router;
