const Meeting = require('../models/Meeting');
const { User } = require('../models/User');

// Schedule meeting
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, scheduledWith, date, duration, message } = req.body;

    // Basic validation
    if (!scheduledWith || !date || !duration) {
      return res.status(400).json({ message: 'scheduledWith, date and duration are required' });
    }

    if (scheduledWith === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot schedule a meeting with yourself' });
    }

    const targetUser = await User.findById(scheduledWith);
    if (!targetUser) {
      return res.status(404).json({ message: 'User to schedule with not found' });
    }

    const conflict = await Meeting.findOne({
      $or: [
        { scheduledBy: req.user._id },
        { scheduledWith: req.user._id },
        { scheduledBy: scheduledWith },
        { scheduledWith: scheduledWith }
      ],
      date: {
        $gte: new Date(new Date(date).getTime() - duration * 60000),
        $lte: new Date(new Date(date).getTime() + duration * 60000)
      },
      status: { $in: ['pending', 'accepted'] }
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    const meeting = await Meeting.create({
      title,
      scheduledBy: req.user._id,
      scheduledWith,
      date,
      duration,
      message
    });

    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get my meetings
exports.getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { scheduledBy: req.user._id },
        { scheduledWith: req.user._id }
      ]
    })
      .populate('scheduledBy', 'name email avatarUrl role')
      .populate('scheduledWith', 'name email avatarUrl role')
      .sort({ date: 1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['accepted', 'declined', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const isInvitee = meeting.scheduledWith.toString() === req.user._id.toString();
    const isScheduler = meeting.scheduledBy.toString() === req.user._id.toString();

    if (!isInvitee && !isScheduler) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (isScheduler && !isInvitee && status !== 'cancelled') {
      return res.status(403).json({ message: 'Scheduler can only cancel the meeting' });
    }

    if (['declined', 'cancelled'].includes(meeting.status)) {
      return res.status(400).json({ message: `Meeting is already ${meeting.status}, cannot update` });
    }

    meeting.status = status;
    await meeting.save();

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};