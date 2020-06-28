var express = require('express');
let createError = require('http-errors');
var router = express.Router();
var db = require('../database/database');
var cos = require('../cos/cos');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username == undefined) res.redirect('/');
    else {
        db.getUserInfo(req.session.uid, (err, dat) => {
            if (err || dat.type <= 0) {
                next(createError(403));
                return;
            } else {
                res.render('superadmin', { userInfo: dat, uid: req.session.uid, username: req.session.username });
            }
        })
    }
});

module.exports = router;
