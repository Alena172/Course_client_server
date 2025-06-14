const express = require('express');
const router = express.Router(); 
const auth = require('../middleware/auth');
const {
  addToJournal,
  getUserJournal,
  deleteFromJournal,
  getRecommendations,
  searchNewsByQuery,
  strictSearchNews,
  getAllNews
} = require('../controllers/newsController');

router.post('/journal', auth,  addToJournal);

router.delete('/journal/:entryId',auth, deleteFromJournal);

router.get('/:userId/journal', auth, getUserJournal);

router.get('/recommendations/:userId', auth, getRecommendations); 

router.get('/search', searchNewsByQuery);

router.get('/all', getAllNews);

router.get('/strict-search', strictSearchNews);

module.exports = router;
