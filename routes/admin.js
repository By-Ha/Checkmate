var express = require('express');
var router = express.Router();
var db = require('../database/database');
var ejs = require('ejs');
var createError = require('http-errors');
var config = require('../config.json');

function rnd(seed) {
    seed = (seed * config.rnd.arg1 + config.rnd.arg2) % config.rnd.arg3;
    return seed;
};

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username) {
        db.getUserInfo(req.session.uid, (err, dat)=>{
            if(err) {next(createError(500)); return ;}
            res.render('admin.ejs', { username: req.session.username, uid: req.session.uid, userInfo: dat });
        })
        return;
    } else {
        res.redirect('/login');
        return;
    }
});

router.get('/post', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.query.uid != req.session.uid && req.query.uid != undefined) {
        db.getUserInfo(req.session.uid, (err, dat) => {
            if (err) { res.json({ status: 'error', msg: '数据库错误' }); return; }
            else if (dat.type <= 0) { res.json({ status: 'error', msg: 'Permission denied' }); return; }
            else {
                db.getUserPostByPID(req.query.uid, req.query.pid, 10, (err, dat) => {
                    if (err) { res.json({ status: 'error', msg: '超出范围' }); return; }
                    else { res.render('admin/post', { dat: dat }); return; }
                })
            }
        })
    } else {
        db.getUserPostByPID(req.session.uid, req.query.pid, 10, (err, dat) => {
            if (err) { res.json({ status: 'error', msg: '超出范围' }); return; }
            else { res.render('admin/post', { dat: dat }); return; }
        })
    }
})

router.get('/edit', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getUserInfo(req.session.uid, (err1, dat1) => {
        if (err1) { res.json({ status: 'error', msg: '数据库错误' }); return; }
        db.getSourcePost(req.query.pid, (err, dat) => {
            if (err || !dat) { res.json({ status: 'error', msg: '超出范围' }); return; }
            else if (dat.user_id == req.session.uid || dat1.type > 0) {
                res.render('admin/edit', { dat: dat }); return;
            } else { res.json({ status: 'error', msg: 'Permission Denied' }); return; }
        })
    })
})

router.get('/battle', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.query.page == undefined) { res.json({ status: 'error', msg: '超出范围' }); return; }
    db.getUserBattle(req.session.uid, req.query.page, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: '超出范围' }); return; }
        else {
            res.render('admin/battle', { dat: dat });
            return;
        }
    })
})

router.post('/super/ban', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.body.banID == undefined || req.body.banType == undefined || req.body.banTime == undefined) {
        res.json({ status: 'error', msg: 'No Enough Info.' });
        return;
    }
    db.getUserInfo(req.session.uid, (err1, dat1) => {
        if (err1) { res.json({ status: 'error', msg: '数据库错误' }); return; }
        if (dat1.type <= 0 || dat1.type >= 5) { res.json({ status: 'error', msg: 'Permission Denied.' }); return; }
        if (req.body.banType == 'set') {
            db.getUserInfo(req.body.banID, (err2, dat2) => {
                if(err2) {res.json({ status: 'error', msg: 'Database error.' });return;}
                if (dat2.type > 0 && dat2.type <= dat1.type) { // 判断是否足够权限
                    res.json({ status: 'error', msg: 'No Enough Auth.' });
                    return;
                } else {
                    db.setBan(req.body.banID, req.body.banTime, (err, dat)=>{
                        if(err) {res.json({status: 'error', msg:'Error.'}); return ;}
                        else {res.json({status: 'success', msg:'Banned.'}); return ;}
                    })
                }
            });
        } else {
            db.cancelBan(req.body.banID, (err, dat)=>{
                if(err) {res.json({status: 'error', msg:'Error.'}); return ;}
                else {res.json({status: 'success', msg:'Cancelled.'}); return ;}
            })
        }
    })
})
module.exports = router;
