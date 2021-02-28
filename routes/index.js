var express = require('express');
var router = express.Router();
var db = require('../database/database');
var ejs = require('ejs');
var createError = require('http-errors');
const { path } = require('../app');

/* Check ban */

let ip_list = new Map();

router.get('/*', function (req, res, next) {
    let debug = false;
    // let uip = req.headers['x-real-ip'];
    // if (ip_list[uip] == undefined) {
    //     var https = require("https");
    //     https.get("https://www.hao7188.com/ip/" + uip + ".html", function (res) {
    //         console.log(ip_list)
    //         var dataString = "";
    //         res.on("data", function (data) {
    //             dataString += data;
    //         });
    //         res.on("end", function () {
    //             if (dataString.indexOf('南京') != -1) {
    //                 ip_list[uip] = '南京'
    //             } else {
    //                 ip_list[uip] = ''
    //             }
    //             if (ip_list[uip].indexOf('南京') != -1 && req.session.uid) {
    //                 db.setBan(req.session.uid, 0.02);
    //             }
    //         });
    //     });
    // }
    // else if (ip_list[uip].indexOf('南京') != -1 && req.session.uid) {
    //     db.setBan(req.session.uid, 0.02);
    // }

    if (debug && req.path != '/checkmate/room/ceshifangjian') {
        res.json({ msg: '维护中,别打了' });
        return;
    }
    if (!req.session.username) {
        if (req.path != '/login' && req.path != '/register' && req.path != '/api/captcha') { res.redirect('/login'); return; }
        else { next(); return; }
    }
    db.getUserInfo(req.session.uid, (err, dat) => {
        if (err) { next(createError(500)); return; }
        if (dat.ban_time == '0000-00-00 00:00:00' || dat.ban_time <= new Date() || dat.ban_type == 0 || req.path == '/logout') { next(); return; }
        else {
            res.render('ban.ejs', { ban_time: dat.ban_time });
            return;
        }
    })
})

router.post('/*', function (req, res, next) {
    if (!req.session.username) {
        if (req.path != '/login' && req.path != '/register') { res.json({ status: 'error', msg: 'Please login or register.' }); return; }
        else { next(); return; }
    }
    db.getUserInfo(req.session.uid, (err, dat) => {
        if (err) { next(createError(500)); return; }
        if (dat.ban_time == '0000-00-00 00:00:00' || dat.ban_time <= new Date() || dat.ban_type == 0 || req.path == '/logout') { next(); return; }
        else {
            res.json({ status: 'error', msg: 'You are banned.' });
            return;
        }
    })
})

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username) {
        db.getTypePost(0, 1, 10, function (err, dat) {
            if (err) {
                next(createError(500));
                console.log(err);
            }
            else {
                db.getUserInfo(req.session.uid, (err2, dat2) => {
                    if (err2) next(createError(500));
                    res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: 1, userInfo: dat2, rating: db.getRatingList() });
                    return;
                })
            }
        });
    } else {
        res.redirect('/login');
        return;
    }
});

router.get('/page/:pid', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getTypePost(0, req.params.pid, 10, function (err, dat) {
        if (err) { next(createError(500)); return; }
        else {
            db.getUserInfo(req.session.uid, (err2, dat2) => {
                if (err2) { next(createError(500)); return; }
                else if (dat.length == 10) {
                    res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: req.params.pid, userInfo: dat2 });
                    return;
                }
                else {
                    res.render('index', { title: '首页', username: req.session.username, uid: req.session.uid, dat: dat, page: -1, userInfo: dat2 });
                    return;
                }
            })
        }
    });
})

module.exports = router;
