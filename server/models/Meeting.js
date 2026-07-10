const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // minutes mein
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  message: { type: String, default: '' },
  meetingLink: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);