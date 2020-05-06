var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET home page. */
router.get('/:pid', function (req, res) {
    db.getPost(req.params.pid, function (err, dat) {
        if (err) {
            res.send('404');
            return;
        }
        res.render('post', { title: dat.user_name + '的说说', username: req.session.username, uid: req.session.uid, dat: dat });
    })
})

module.exports = router;
