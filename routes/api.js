var express = require('express');
var router = express.Router();
var db = require('../database/database');
var multer = require('multer')
var webp = require('webp-converter');
var fs = require('fs');
var cos = require('../cos/cos');
var sharp = require('sharp');

var upload = multer({
    dest: '/tmp/Kana/upload',
    limits: {
        files: 1,
        fileSize: 5 * 1000 * 1024
    }
});

router.post('/', function (req, res) {
    res.json({ 'status': 'success' });
})

router.post('/user/post', function (req, res) {
    db.queryUserContent(req.body.uid, req.body.page, 10, (err, dat) => {
        if (err) res.json({ status: 'error', msg: '超出范围' });
        else res.json({ status: 'success', dat: dat });
    })
})

router.post('/user/level', function (req, res) {
    if (req.body.uid != undefined) {
        db.getUserLevelById(req.body.uid, (err, dat) => {
            if (err) res.json({ status: 'error', msg: err });
            else res.json({ status: 'success', msg: dat });
        })
    }
    else db.getUserLevelByUsername(req.body.uname, (err, dat) => {
        if (err) res.json({ status: 'error', msg: err });
        else res.json({ status: 'success', msg: dat });
    })
})

router.post('/user/exp', function (req, res) {
    if (req.body.uid != undefined) {
        db.getUserExperienceById(req.body.uid, (err, dat) => {
            if (err) res.json({ status: 'error', msg: err });
            else res.json({ status: 'success', msg: dat });
        })
    }
    else db.getUserExperienceByUsername(req.body.uname, (err, dat) => {
        if (err) res.json({ status: 'error', msg: err });
        else res.json({ status: 'success', msg: dat });
    })
})

router.get('/user/commentAmount', function (req, res) {
    let uid = 0;
    if (req.query.uid == undefined) uid = req.session.uid;
    else uid = req.query.uid;
    db.getUserCommentAmount(uid, (err, dat) => {
        if (err) res.json({ status: error, msg: '数据库错误' });
        else res.json({ status: 'success', msg: dat });
    })
})

router.get('/user/postAmount', function (req, res) {
    let uid = 0;
    if (req.query.uid == undefined) uid = req.session.uid;
    else uid = req.query.uid;
    db.getUserPostAmount(uid, (err, dat) => {
        if (err) res.json({ status: error, msg: '数据库错误' });
        else res.json({ status: 'success', msg: dat });
    })
})

router.post('/page', function (req, res) {
    db.queryTypeContent(0, req.body.page, 10, (err, dat) => {
        if (err) res.json({ status: 'error', msg: '超出范围' });
        else res.json({ status: 'success', dat: dat });
    })
})

router.post('/post', function (req, res) {
    if (req.session.username == undefined) {
        res.json({ status: ('error'), msg: '请先登录' });
        return;
    }
    if (req.body.content == undefined || req.body.content.length <= 2 || req.body.content.length >= 1000) {
        res.json({ status: ('error'), msg: '内容长度不符合规范' });
        return;
    }
    if (req.body.type != 0) {
        res.json({ status: ('error'), msg: '类型错误' });
        return;
    }
    db.post(req.session.username, req.body.type, req.body.content, function (err, dat) {
        if (err) res.json({ status: ('error'), msg: '数据库错误' });
        else res.json({ status: ('success'), msg: '发送成功' });
    })
});

router.get('/comment', function (req, res) {
    if (req.query.pid == undefined || req.query.page == undefined || req.query.parent == undefined) {
        res.json({ status: 'error', msg: '非法请求' });
        return;
    }
    db.getComment(req.query.pid, req.query.parent, req.query.page, (err, dat) => {
        if (err) {
            res.json({ status: 'error', msg: '数据库错误' });
            return;
        }
        else res.json({ status: 'success', dat: dat });
    })
})

router.post('/comment', function (req, res) {
    if (req.session.username == undefined) {
        res.json({ status: ('error'), msg: '请先登录' });
        return;
    }
    if (req.body.comment == undefined || req.body.comment.length <= 2 || req.body.comment.length >= 1000) {
        res.json({ status: ('error'), msg: '内容长度不符合规范' });
        return;
    }
    if (req.body.pid == undefined || req.body.parent == undefined) {
        res.json({ status: ('error'), msg: '请求非法' });
        return;
    }
    db.postCommentByUsername(req.body.pid, req.body.parent, req.session.username, req.body.comment, function (err, dat) {
        if (err) res.json({ status: ('error'), msg: '数据库错误' });
        else res.json({ status: ('success'), msg: '发送成功' });
    })
})

router.get('/commentAmount', function (req, res) {
    if (req.query.pid == undefined || req.query.parent == undefined) {
        res.json({ status: 'error', msg: '非法请求' });
        return;
    }
    db.getCommentAmount(req.query.pid, req.query.parent, (err, dat) => {
        if (err) {
            res.json({ status: 'error', msg: '数据库错误' });
            return;
        }
        else res.json({ status: 'success', dat: dat });
    })
})

router.post('/getSourcePost', function (req, res) {
    db.getSourcePost(req.body.pid, (err, dat) => {
        if (err) res.json({ 'status': 'error', 'msg': 'No Such User' });
        else res.json({ 'status': 'success', 'msg': dat[0].content });
    })
})

router.post('/updatepost', function (req, res) {
    if (req.session.username == undefined) {
        res.json({ status: ('error'), msg: '请先登录' });
        return;
    }
    if (req.body.content == undefined || req.body.content.length <= 2 || req.body.content.length >= 1000) {
        res.json({ status: ('error'), msg: '内容长度不符合规范' });
        return;
    }
    db.updatePost(req.body.pid, req.session.username, req.body.content, function (err, dat) {
        if (err) res.json({ status: ('error'), msg: err });
        else res.json({ status: ('success'), msg: '修改成功' });
    })
})

router.post('/deletepost', function (req, res) {
    if (req.session.username == undefined) {
        res.json({ status: ('error'), msg: '请先登录' });
        return;
    }
    db.deletePost(req.body.pid, req.session.username, function (err, dat) {
        if (err) res.json({ status: ('error'), msg: err });
        else res.json({ status: ('success'), msg: '删除成功' });
    })
})

router.post('/upload/avatar', upload.single('avatar'), function (req, res) {
    if (typeof (req.session.uid) != "number") return;
    var imgType = req.file.mimetype; // 图片类型
    var url = "/tmp/Kana/upload/" + req.file.filename;
    if (imgType == "image/png" || imgType == "image/jpeg") {
        webp.cwebp(url, "/tmp/Kana/upload/" + req.file.filename.split(".")[0] + ".webp", "-q 80", function (status, error) {
            if (error) return false;
            img = req.file.filename.split(".")[0] + ".webp";
            var oldUrl = "/tmp/Kana/upload/" + req.file.filename; // 原文件地址
            fs.unlink(oldUrl, function (error) {
                if (error) {
                    return false;
                }
                cos.uploadFile('/tmp/Kana/upload/', img, '/img/user/avatar/', req.session.uid + '.webp');
                fs.unlink("/tmp/Kana/upload/" + img, () => { });
            })
        })
    }
    res.send({ ret_code: '0' });
})

router.post('/upload/banner', upload.single('banner'), function (req, res) {
    if (typeof (req.session.uid) != "number") return;
    var imgType = req.file.mimetype; // 图片类型
    var url = "/tmp/Kana/upload/" + req.file.filename;
    if (imgType == "image/png" || imgType == "image/jpeg") {
        webp.cwebp(url, "/tmp/Kana/upload/" + req.file.filename.split(".")[0] + ".webp", "-q 80", function (status, error) {
            if (error) return false;
            img = req.file.filename.split(".")[0] + ".webp";
            var oldUrl = "/tmp/Kana/upload/" + req.file.filename; // 原文件地址
            fs.unlink(oldUrl, function (error) {
                if (error) {
                    return false;
                }
                sharp('/tmp/Kana/upload/' + img)
                    .resize(1504, 376) //缩放
                    .toFile('/tmp/Kana/upload/' + img + '.webp')
                    .then(()=>{
                        cos.uploadFile('/tmp/Kana/upload/', img + '.webp', '/img/user/banner/', req.session.uid + '.webp');
                        fs.unlink("/tmp/Kana/upload/" + img, () => { });
                        fs.unlink("/tmp/Kana/upload/" + img + '.webp', () => { });
                    })
            })
        })
    }
    res.send({ ret_code: '0' });
})

router.post('/template', function (req, res) {
    res.json({
        'status': 'success', 'msg': `
    <% var username = $("#usercard-name")[0].innerHTML.slice(1); %>
    <% function dateFtt(fmt,date){var o={"M+":date.getMonth()+1,"d+":date.getDate(),"h+":date.getHours(),"m+":date.getMinutes(),"s+":date.getSeconds(),"q+":Math.floor((date.getMonth()+3)/3),"S":date.getMilliseconds()};if(/(y+)/.test(fmt))fmt=fmt.replace(RegExp.$1,(date.getFullYear()+"").substr(4-RegExp.$1.length));for(var k in o)if(new RegExp("("+k+")").test(fmt))fmt=fmt.replace(RegExp.$1,(RegExp.$1.length==1)?(o[k]):(("00"+o[k]).substr((""+o[k]).length)));return fmt} %>
    <% function delta(time){var interval=new Date().getTime()-time;var returnTime="";var years=Math.floor(interval/(30*24*3600*1000));if(years==0){var months=Math.floor(interval/(30*24*3600*1000));if(months==0){var days=Math.floor(interval/(24*3600*1000));if(days==0){var leaveTime=interval%(24*3600*1000);var hours=Math.floor(leaveTime/(3600*1000));if(hours==0){leaveTime=leaveTime%(3600*1000);var minutes=Math.floor(leaveTime/(60*1000));if(minutes==0){leaveTime=leaveTime%(60*1000);var seconds=Math.round(leaveTime/1000);return seconds+"秒前"}return minutes+"分钟前"}return hours+"小时前"}return days+"天前"}return months+"月前"}return years+"年前"} %> 

    <article class="<%= (art.type==0)?'shuoshuo':'blog' %> kana-item" pid="<%= art.id %>">
        <div class="post-info">
            <div class="post-info-author">
                <img class="avatar" src="https://kana-1252071452.cos.ap-shanghai.myqcloud.com/img/user/avatar/<%= art.user_id %>.webp!50x50" height="48px" width="48px">
                <div class="post-info-author-username">
                    <a rel="author" href="/user/username/<%= art.user_name %>"><%= art.user_name %></a>
                    <i class="iconfont"></i>
                </div>
                <% if(username == art.user_name || username == 'admin') {%>
                    <a class="delete" href="#" pid="<%= art.id %>" style="color: red;">删除</a>
                    <a class="edit" href="#write" pid="<%= art.id %>">编辑</a>
                <% } %>
            </div>
            <div class="post-info-meta">
                <time title="<%= dateFtt("yyyy-MM-dd hh:mm:ss", art.created); %>"><%= delta(art.created); %></time>
            </div>
            <div class="post-info-content"><a><object><%- art.content %></object></a></div>
            <div class="post-toolbar">
                <span class="post-comment-num"><a href="/post/<%= art.id %>"><i class="iconfont icon-comment"></i>0</a></span>
            </div>
        </div>
    </article>
    `});
})

module.exports = router;
