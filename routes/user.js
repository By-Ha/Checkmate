var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('index', { title: '测试页面' });
});

router.get("/:uid", function (req, res, next) {
  db.getUserInfo(req.params.uid, (err, dat) => {
    if (err) {
      res.send('404');
      return;
    }
    res.render('user', { title: dat.username, username: req.session.username, uid: req.session.uid, dat: dat });
  })
});

router.get("/username/:uname", function (req, res) {
  db.getUserId(req.params.uname, (err, dat) => {
    res.redirect("/user/" + String(dat));
  })
});

module.exports = router;
