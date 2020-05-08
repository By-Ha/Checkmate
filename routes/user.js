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
        db.queryUserContent(req.params.uid, 1, 10, (err2, dat2)=>{
            db.getUserInfo(req.session.uid, (err3, dat3)=>{
                if(err2 || err3) {
                    res.send('404');
                    return;
                }
                else res.render('user', { title: dat.username, username: req.session.username, uid: req.session.uid, userInfo: dat3, userInfo2: dat, userPost: dat2, page: 1 });
            })
        })
    })
});

router.get("/:uid/page/:page", function (req, res, next) {
    db.getUserInfo(req.params.uid, (err, dat) => {
        if (err) {
            res.send('404');
            return;
        }
        db.queryUserContent(req.params.uid, req.params.page, 10, (err2, dat2)=>{
            db.getUserInfo(req.session.uid, (err3, dat3)=>{
                if(err2 || err3) {
                    res.send('404');
                    return;
                }
                else res.render('user', { title: dat.username, username: req.session.username, uid: req.session.uid, userInfo: dat3, userInfo2: dat, userPost: dat2, page: req.params.page });
            })
        })
    })
});


module.exports = router;
