var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.session.username != undefined) res.redirect('/');
  res.render('login' , { username: undefined });
});

router.post('/', function(req, res){
  db.login(req.body.username, req.body.pwd, function(err, dat){
    if(err) res.json({status: ('error'), msg: err});
    if(dat[0] == 0) {
      req.session.username = req.body.username;
      req.session.uid = dat[2].id;
    }
    res.json({status: (dat[0]==0?'success':'error'), msg: dat[1]});
  })
});

module.exports = router;
