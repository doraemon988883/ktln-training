var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  // res.send('respond with a resource');
  res.render('live-stream')
});

router.get('/live', function(req, res, next) {
  // res.send('respond with a resource');
  res.render('live-stream-live')
});

router.get('/view', function(req, res, next) {
  // res.send('respond with a resource');
  res.render('live-stream-view')
});

module.exports = router;
