const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  startMeeting,
  getActiveMeeting,
  endMeeting,
  updateMeeting,
  getMeetings,
  getMeetingById,
  deleteMeeting,
} = require('../controllers/meetingController');

router.use(protect);

router.post('/start', startMeeting);
router.get('/active', getActiveMeeting);
router.post('/:id/end', endMeeting);
router.patch('/:id', updateMeeting);
router.get('/', getMeetings);
router.get('/:id', getMeetingById);
router.delete('/:id', deleteMeeting);

module.exports = router;
