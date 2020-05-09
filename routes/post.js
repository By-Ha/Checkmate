var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET home page. */
router.get('/:pid', function (req, res) {
    if (req.session.username == undefined) {res.redirect('/login');return ;}
    db.getPost(req.params.pid, function (err, dat) {
        if (err) {
            res.send('404');
            return;
        }
        db.getUserInfo(req.session.uid, (err2, dat2)=>{
            res.render('post', { title: dat.user_name + '的说说', username: req.session.username, uid: req.session.uid, dat: dat, userInfo: dat2 });
        })
    })
})

module.exports = router;
