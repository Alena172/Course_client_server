const express = require('express');
const router = express.Router(); 
const auth = require('../middleware/auth');
const newsController = require('../controllers/newsController')
const {
  addToJournal,
  getUserJournal,
  deleteFromJournal,
  getRecommendations,
  // proxyGNewsAPI,
  searchNewsByQuery,
  strictSearchNews,
  getAllNews
} = require('../controllers/newsController');

// router.get('/proxy/newsapi', proxyGNewsAPI);

router.post('/journal', auth,  addToJournal);

router.delete('/journal/:entryId',auth, deleteFromJournal);

router.get('/:userId/journal', auth, getUserJournal);

router.get('/recommendations/:userId', auth, getRecommendations); 

router.delete('/:id', auth, newsController.deleteNews);

router.get('/search', searchNewsByQuery);

router.get('/all', getAllNews);

router.get('/strict-search', strictSearchNews);

module.exports = router;
