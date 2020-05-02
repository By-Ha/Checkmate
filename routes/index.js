var express = require('express');
var router = express.Router();
var db = require('../database/database')

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.username) {
    db.queryTypeContent(0, 1, 10, function(err, dat){
      if(err) res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: null });
      res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat });
    });
  } else {
    res.redirect('/login');
  }
});

router.get('/page/:pid', function(req, res, next) {
  db.queryTypeContent(0, req.params.pid, 10, function(err,dat){
    if(err) res.send(null);
    else res.send(dat); 
  });
})

module.exports = router;
