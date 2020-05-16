var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/', function (req, res) {
    req.session.username = null; // 删除session
    req.session.uid = null;
});
router.get('/', function (req, res) {
    res.render('logout');
});

module.exports = router;
