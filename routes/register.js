var express = require('express');
var router = express.Router();
var db = require('../database/database');
var cos = require('../cos/cos');

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.username != undefined) res.redirect('/');
  res.render('register', { username: undefined });
});

router.post('/', function (req, res) {
  db.register(req.body.username, req.body.pwd, function (err, dat) {
    if (err) res.json({ status: 'error', msg: err });
    if (dat[0] == 0) {
      req.session.username = req.body.username;
      req.session.uid = dat[2];
      cos.uploadFile('/www/wwwroot/Kana/public/img/', 'akari.jpg', '/img/user/avatar/', dat[2] + '.webp');
    }
    res.json({ status: (dat[0] == 0 ? 'success' : 'error'), msg: dat[1] });
  })
});



module.exports = router;
