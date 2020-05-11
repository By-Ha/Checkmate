var express = require('express');
var router = express.Router();
var db = require('../database/database');
var ejs = require('ejs');
var createError = require('http-errors');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username) {
        res.render('admin.ejs', { username: req.session.username, uid: req.session.uid });
    } else {
        res.redirect('/login');
    }
});

router.get('/post', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.query.uid != undefined && req.session.uid != req.query.uid && req.session.uid != 1) { res.json({ status: 'error', msg: 'Permission denied' }); return; }
    db.getUserPostByPID((req.query.uid == undefined ? req.session.uid : req.query.uid), req.query.pid, 10, (err, dat) => {
        if (err) res.json({ status: 'error', msg: '超出范围' });
        else res.render('admin/post', { dat: dat });
    })
})

router.get('/edit', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getSourcePost(req.query.pid, (err, dat) => {
        if (err) res.json({ status: 'error', msg: '超出范围' });
        else if (dat.user_id == req.session.uid || req.session.uid == 1) {
            res.render('admin/edit', { dat: dat });
        } else res.json({ status: 'error', msg: 'Permission Denied' });
    })
})

module.exports = router;
