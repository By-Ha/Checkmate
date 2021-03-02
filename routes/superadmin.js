var express = require('express');
let createError = require('http-errors');
var router = express.Router();
var db = require('../database/database');
var cos = require('../cos/cos');
const uuid = require('uuid')

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

router.get('/addRedeem5k', function(req,res){
    // let ret = ''
    // for(let i = 1; i<=3;++i){
    //     let _uuid = uuid.v4();
    //     db.runSQL('INSERT INTO `redeem`(`redeem`, `redeem_type`) VALUES (?, 0)', [_uuid], ()=>{});
    //     ret += _uuid
    //     ret += '\n'
    // }
    // res.send(ret)
})

module.exports = router;
