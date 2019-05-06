var express = require('express');
var router = express.Router();

var con = require('../helper/db-connector')

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

router.get('/test', function(req, res, next){
  con.connect(function(err) {
    if (err) throw err;
    con.query("SELECT * FROM tai_khoan", function (err, result, fields) {
      if (err) throw err;
      console.log(result);
    });
  });
})

module.exports = router;
