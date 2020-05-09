var express = require('express');
var router = express.Router();
var db = require('../database/database');
var ejs = require('ejs');
var createError = require('http-errors');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username) {
        db.queryTypeContent(0, 1, 10, function (err, dat) {
            if (err) next(createError(500));
            else {
                db.getUserInfo(req.session.uid, (err2, dat2) => {
                    if (err2) next(createError(500));
                    res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: 1, userInfo: dat2 });
                })
            }
        });
    } else {
        res.redirect('/login');
    }
});

router.get('/page/:pid', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.queryTypeContent(0, req.params.pid, 10, function (err, dat) {
        if (err) next(createError(500));
        else {
            db.getUserInfo(req.session.uid, (err2, dat2) => {
                if (err2) next(createError(500));
                else if (dat.length == 10)
                    res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: req.params.pid, userInfo: dat2 });
                else res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: -1, userInfo: dat2 });
            })
        }
    });
})

module.exports = router;
