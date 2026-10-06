const mongoose = require('mongoose');

const meetingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    clientName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: 'Client Meeting',
    },
    location: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled'],
      default: 'ongoing',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
