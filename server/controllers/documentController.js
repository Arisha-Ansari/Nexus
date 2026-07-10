const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

// @desc    Upload a new document
// @route   POST /api/documents
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { title, meetingId, sharedWith } = req.body;

    if (!title) {
      // Clean up the uploaded file since we're rejecting this request
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title is required.' });
    }

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';

    // sharedWith can arrive as a JSON string (from FormData) or an actual array
    let sharedWithArray = [];
    if (sharedWith) {
      sharedWithArray = typeof sharedWith === 'string' ? JSON.parse(sharedWith) : sharedWith;
    }

    const document = await Document.create({
      title,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileType,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user.id,
      meetingId: meetingId || null,
      sharedWith: sharedWithArray
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('uploadedBy', 'name email role')
      .populate('sharedWith', 'name email role');

    res.status(201).json(populatedDoc);
  } catch (error) {
    // If something went wrong after the file was saved to disk, clean it up
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Error uploading document.', error: error.message });
  }
};

// @desc    Get all documents relevant to the logged-in user (uploaded by them or shared with them)
// @route   GET /api/documents
// @access  Private
const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { uploadedBy: req.user.id },
        { sharedWith: req.user.id }
      ]
    })
      .populate('uploadedBy', 'name email role')
      .populate('sharedWith', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents.', error: error.message });
  }
};

// @desc    Get a single document by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email role')
      .populate('sharedWith', 'name email role')
      .populate('signature.signedBy', 'name email role');

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Only the uploader or someone in sharedWith can view it
    const isUploader = document.uploadedBy._id.toString() === req.user.id;
    const isSharedWithUser = document.sharedWith.some(
      (user) => user._id.toString() === req.user.id
    );

    if (!isUploader && !isSharedWithUser) {
      return res.status(403).json({ message: 'You do not have access to this document.' });
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document.', error: error.message });
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private (uploader only)
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the uploader can delete this document.' });
    }

    // Remove the actual file from disk
    const filePath = path.join(__dirname, '..', document.fileUrl);
    fs.unlink(filePath, (err) => {
      if (err) console.error('File deletion error (continuing anyway):', err.message);
    });

    await document.deleteOne();

    res.status(200).json({ message: 'Document deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document.', error: error.message });
  }
};

// @desc    Sign a document
// @route   PUT /api/documents/:id/sign
// @access  Private (must be in sharedWith list)
const signDocument = async (req, res) => {
  try {
    const { signatureImage } = req.body;

    if (!signatureImage) {
      return res.status(400).json({ message: 'Signature image is required.' });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (document.status === 'signed') {
      return res.status(400).json({ message: 'This document has already been signed.' });
    }

    // Only the uploader or someone in sharedWith can sign it
    const isUploader = document.uploadedBy.toString() === req.user.id;
    const isSharedWithUser = document.sharedWith.some(
      (userId) => userId.toString() === req.user.id
    );

    if (!isUploader && !isSharedWithUser) {
      return res.status(403).json({ message: 'You are not authorized to sign this document.' });
    }

    document.status = 'signed';
    document.signature = {
      signedBy: req.user.id,
      signatureImage,
      signedAt: new Date()
    };

    await document.save();

    const populatedDoc = await Document.findById(document._id)
      .populate('uploadedBy', 'name email role')
      .populate('sharedWith', 'name email role')
      .populate('signature.signedBy', 'name email role');

    res.status(200).json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error signing document.', error: error.message });
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  deleteDocument,
  signDocument
};