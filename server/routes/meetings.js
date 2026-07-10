const express = require('express');
const router = express.Router();
const { scheduleMeeting, getMyMeetings, updateMeetingStatus } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

router.post('/', protect, scheduleMeeting);
router.get('/', protect, getMyMeetings);
router.put('/:id', protect, updateMeetingStatus);

module.exports = router;