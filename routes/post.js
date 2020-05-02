var express = require('express');
var router = express.Router();
var db = require('../database/database');

/* GET home page. */
router.post('/', function (req, res) {
    if (req.session.username == undefined) {
        res.json({ status: ('error'), msg: '请先登录' });
        return;
    }
    if (req.body.content == undefined || req.body.content.length <= 2 || req.body.content.length >= 1000) {
        res.json({ status: ('error'), msg: '内容长度不符合规范' });
        return;
    }
    if(req.body.type != 0){
        res.json({ status: ('error'), msg: '类型错误' });
        return;
    }
    db.post(req.session.username, req.body.type, req.body.content, function(err, dat){
        if(err) res.json({ status: ('error'), msg: '数据库错误' });
        else res.json({ status: ('success'), msg: '发送成功' });
    })
});

module.exports = router;
