var express = require('express');
var router = express.Router();
var db = require('../database/database');
var cos = require('../cos/cos');

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.username != undefined) res.redirect('/');
  else { res.render('register', { username: undefined }); return; }
});

router.post('/', function (req, res) {
  if (req.body.username.match(/[^\x00-\xff]+/g) != null || req.body.username.match(" ") != null) { res.json({ status: 'error', msg: '现在只允许英文字母与符号注册' }); return; }
  db.register(req.body.username, req.body.pwd, function (err, dat) {
    if (err) { res.json({ status: 'error', msg: err }); return; };
    console.log(dat);
    if (dat[0] == 0) {
      req.session.username = req.body.username;
      req.session.uid = dat[2];
      cos.uploadFile('./public/img/', 'akari.jpg', '/img/user/avatar/', dat[2] + '.webp');
      cos.uploadFile('./public/img/', 'banner.jpg', '/img/user/banner/', dat[2] + '.webp');
    }
    res.json({ status: (dat[0] == 0 ? 'success' : 'error'), msg: dat[1] });
    return;
  })
});

module.exports = router;
