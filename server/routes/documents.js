const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  deleteDocument,
  signDocument
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getMyDocuments);
router.get('/:id', protect, getDocumentById);
router.delete('/:id', protect, deleteDocument);
router.put('/:id/sign', protect, signDocument);

module.exports = router;