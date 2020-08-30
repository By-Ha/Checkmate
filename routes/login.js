var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.username != undefined) res.redirect('/');
    else { res.render('login', { username: undefined }); return; }
});

router.post('/', function (req, res) {
    if(req.body.cap == undefined || req.body.cap.toLowerCase() != req.session.captcha.toLowerCase()){
        res.json({ status: ('error'), msg: '验证码错误' }); return;
    }
    db.login(req.body.username, req.body.pwd, req.headers['x-real-ip'], function (err, dat) {
        if (err) { res.json({ status: ('error'), msg: err }); return; }
        if (dat[0] == 0) {
            req.session.username = String(req.body.username);
            req.session.uid = String(dat[2].id);
        }
        res.json({ status: (dat[0] == 0 ? 'success' : 'error'), msg: dat[1] });
        return;
    })
});

module.exports = router;
