var express = require('express');
var router = express.Router();
var db = require('../database/database');
var cos = require('../cos/cos');

/* GET home page. */
let ips = {};

router.get('/', function (req, res, next) {
  if (req.session.username != undefined) res.redirect('/');
  else { res.render('register', { username: undefined }); return; }
});

router.post('/', function (req, res) {
  if(ips[req.headers['x-real-ip']] && ips[req.headers['x-real-ip']] >= new Date().getTime() - 600 * 1000) return res.json({ status: 'error', msg: '同ip10分钟内仅允许注册一个账号' });
  if (req.body.username.match(/^[\u4e00-\u9fa5_a-zA-Z0-9]+$/) == null) { res.json({ status: 'error', msg: '用户名违规,只允许中文,英文和_' }); return; }
  db.register(req.body.username, req.body.pwd, req.headers['x-real-ip'], function (err, dat) {
    if (err) { res.json({ status: 'error', msg: err }); return; };
    if (dat[0] == 0) {
      ips[req.headers['x-real-ip']] = new Date().getTime();
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
