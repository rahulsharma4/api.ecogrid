const Meeting = require('../models/meetingModel');

// @desc    Start a new meeting
// @route   POST /api/meetings/start
// @access  Private
const startMeeting = async (req, res) => {
  try {
    const { clientName, title, location, notes, photoUrl, lead } = req.body;

    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ message: 'Client Name is required to start a meeting' });
    }

    // Check if user already has an active meeting
    const activeMeeting = await Meeting.findOne({
      user: req.user._id,
      status: 'ongoing'
    });

    if (activeMeeting) {
      return res.status(400).json({
        message: 'You already have an active meeting in progress. Please end it before starting a new one.',
        activeMeeting
      });
    }

    const meeting = new Meeting({
      user: req.user._id,
      owner: req.user.owner || req.user._id,
      clientName: clientName.trim(),
      title: title || 'Client Meeting',
      location: location || '',
      notes: notes || '',
      photoUrl: photoUrl || '',
      lead: lead || null,
      startTime: new Date(),
      status: 'ongoing',
    });

    const createdMeeting = await meeting.save();
    await createdMeeting.populate('user', 'name email phone role');
    if (createdMeeting.lead) {
      await createdMeeting.populate('lead', 'name companyName leadId phone');
      try {
        const Lead = require('../models/leadModel');
        await Lead.findByIdAndUpdate(createdMeeting.lead._id || createdMeeting.lead, {
          $push: {
            history: {
              status: 'Meeting Schedule',
              comment: `Sales Executive started meeting: ${title || 'Client Meeting'}`,
              updatedBy: req.user._id,
              updatedAt: new Date()
            }
          }
        });
      } catch (logErr) {
        console.error('Error logging meeting start to lead history:', logErr);
      }
    }

    res.status(201).json(createdMeeting);
  } catch (error) {
    console.error('Error starting meeting:', error);
    res.status(500).json({ message: error.message || 'Server error starting meeting' });
  }
};

// @desc    Get currently active ongoing meeting for logged in user
// @route   GET /api/meetings/active
// @access  Private
const getActiveMeeting = async (req, res) => {
  try {
    const activeMeeting = await Meeting.findOne({
      user: req.user._id,
      status: 'ongoing'
    })
      .populate('user', 'name email phone role')
      .populate('lead', 'name companyName leadId phone');

    res.status(200).json(activeMeeting || null);
  } catch (error) {
    console.error('Error fetching active meeting:', error);
    res.status(500).json({ message: 'Server error fetching active meeting' });
  }
};

// @desc    End / Close an ongoing meeting
// @route   POST /api/meetings/:id/end
// @access  Private
const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check permission (user himself or admin)
    if (meeting.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to end this meeting' });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({ message: 'Meeting is already closed' });
    }

    const { notes, photoUrl, location } = req.body;

    const endTime = new Date();
    const durationInSeconds = Math.max(0, Math.round((endTime.getTime() - new Date(meeting.startTime).getTime()) / 1000));

    meeting.endTime = endTime;
    meeting.duration = durationInSeconds;
    meeting.status = 'completed';

    if (notes !== undefined) meeting.notes = notes;
    if (photoUrl) meeting.photoUrl = photoUrl;
    if (location) meeting.location = location;

    const updatedMeeting = await meeting.save();
    await updatedMeeting.populate('user', 'name email phone role');
    if (updatedMeeting.lead) {
      await updatedMeeting.populate('lead', 'name companyName leadId phone');
      try {
        const Lead = require('../models/leadModel');
        const mins = Math.floor(durationInSeconds / 60);
        const secs = durationInSeconds % 60;
        const durText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        await Lead.findByIdAndUpdate(updatedMeeting.lead._id || updatedMeeting.lead, {
          $push: {
            history: {
              status: 'Meeting Done(Hot)',
              comment: `Meeting closed. Total Duration: ${durText}.${notes ? ' Remarks: ' + notes : ''}`,
              updatedBy: req.user._id,
              updatedAt: new Date()
            }
          }
        });
      } catch (logErr) {
        console.error('Error logging meeting end to lead history:', logErr);
      }
    }

    res.status(200).json(updatedMeeting);
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ message: 'Server error ending meeting' });
  }
};

// @desc    Update meeting details (photo, notes, location)
// @route   PATCH /api/meetings/:id
// @access  Private
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this meeting' });
    }

    const { notes, photoUrl, location, clientName, title } = req.body;

    if (notes !== undefined) meeting.notes = notes;
    if (photoUrl !== undefined) meeting.photoUrl = photoUrl;
    if (location !== undefined) meeting.location = location;
    if (clientName) meeting.clientName = clientName;
    if (title) meeting.title = title;

    const updatedMeeting = await meeting.save();
    await updatedMeeting.populate('user', 'name email phone role');
    if (updatedMeeting.lead) {
      await updatedMeeting.populate('lead', 'name companyName leadId phone');
    }

    res.status(200).json(updatedMeeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ message: 'Server error updating meeting' });
  }
};

// @desc    Get all meetings with filters
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const { userId, leadId, startDate, endDate, status, search } = req.query;

    let query = {};

    // Ownership or Admin access
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    } else if (userId) {
      query.user = userId;
    }

    if (leadId) {
      query.lead = leadId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.startTime.$lte = eDate;
      }
    }

    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const meetings = await Meeting.find(query)
      .populate('user', 'name email phone role')
      .populate('lead', 'name companyName leadId phone')
      .sort({ createdAt: -1 });

    res.status(200).json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: 'Server error fetching meetings' });
  }
};

// @desc    Get meeting by ID
// @route   GET /api/meetings/:id
// @access  Private
const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('user', 'name email phone role')
      .populate('lead', 'name companyName leadId phone');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (req.user.role !== 'admin' && meeting.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this meeting' });
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    res.status(500).json({ message: 'Server error fetching meeting details' });
  }
};

// @desc    Delete meeting (Admin or owner)
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (req.user.role !== 'admin' && meeting.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this meeting' });
    }

    await meeting.deleteOne();
    res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ message: 'Server error deleting meeting' });
  }
};

module.exports = {
  startMeeting,
  getActiveMeeting,
  endMeeting,
  updateMeeting,
  getMeetings,
  getMeetingById,
  deleteMeeting,
};
