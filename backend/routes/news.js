const express = require('express');
const router = express.Router(); 
const auth = require('../middleware/auth');
const newsController = require('../controllers/newsController')
const {
  addToJournal,
  getUserJournal,
  deleteFromJournal,
  getRecommendations,
  proxyGNewsAPI
} = require('../controllers/newsController');

router.get('/proxy/newsapi', proxyGNewsAPI);

router.post('/journal', auth,  addToJournal);

router.delete('/journal/:entryId',auth, deleteFromJournal);

router.get('/:userId/journal', auth, getUserJournal);

router.get('/recommendations/:userId', auth, getRecommendations); 

router.delete('/:id', auth, newsController.deleteNews);

module.exports = router;
