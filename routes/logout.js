var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/', function (req, res) {
    req.session.username = null; // 删除session
    req.session.uid = null;
    res.redirect('login');
});
router.get('/', function (req, res) {
    req.session.username = null; // 删除session
    req.session.uid = null;
    res.redirect('login');
});

module.exports = router;
