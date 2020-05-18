var express = require('express');
var router = express.Router();
var db = require('../database/database')
var game = require('../game/core')
var createError = require('http-errors');


router.get('/room/:rid', function (req, res, next) {
    if (req.session.username != undefined) {
        db.getTypePost(0, 1, 10, function (err, dat) {
            if (err) { res.json({ code: -1, msg: '加载错误,请刷新或重新登录后重试.' }); return; }
            res.render('checkmate', { title: 'Checkmate', username: req.session.username, uid: req.session.uid, dat: dat, room: req.params.rid });
            return;
        });
    } else {
        res.redirect('/login');
        return;
    }
});

router.get('/room', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    res.render('checkmateHall', { username: req.session.username, uid: req.session.uid, r: game.Rooms });
    return;
})

router.get('/replay/:rid', function (req, res, next) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getReplay(req.params.rid, (err, dat) => {
        if (dat == 0) { next(createError(404)); return; }
        else { res.render('game/replay', { game_data: dat[0].battle_data }); return; }
    })
})

module.exports = router;
