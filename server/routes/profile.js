const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);

module.exports = router;