let express = require('express');
let createError = require('http-errors');
let router = express.Router();
let db = require('../database/database');
let multer = require('multer')
let webp = require('webp-converter');
let fs = require('fs');
let cos = require('../cos/cos');
let sharp = require('sharp');
let msg = require('../message/message').messageEmitter;
let cp = require('child_process');
let svgCaptcha = require('svg-captcha');

var upload = multer({
    dest: '/tmp/Kana/upload',
    limits: {
        files: 1,
        fileSize: 5 * 1000 * 1024
    }
});

router.post('/', function (req, res) {
    res.json({ 'status': 'success' });
    return;
})

// User

router.post('/user/post', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getUserPost(req.body.uid, req.body.page, 10, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: '超出范围' }); return; }
        else { res.json({ status: 'success', dat: dat }); return; }
    })
})

router.post('/user/level', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.body.uid != undefined) {
        db.getUserLevelById(req.body.uid, (err, dat) => {
            if (err) { res.json({ status: 'error', msg: err }); return; }
            else { res.json({ status: 'success', msg: dat }); return; }
        })
    }
    else db.getUserLevelByUsername(req.body.uname, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: err }); return; }
        else { res.json({ status: 'success', msg: dat }); return; }
    })
})

router.post('/user/exp', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.body.uid != undefined) {
        db.getUserExperienceById(req.body.uid, (err, dat) => {
            if (err) { res.json({ status: 'error', msg: err }); return; }
            else { res.json({ status: 'success', msg: dat }); return; }
        })
    }
    else db.getUserExperienceByUsername(req.body.uname, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: err }); return; }
        else { res.json({ status: 'success', msg: dat }); return; }
    })
})

router.get('/user/commentAmount', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    let uid = 0;
    if (req.query.uid == undefined) uid = req.session.uid;
    else uid = req.query.uid;
    db.getUserCommentAmount(uid, (err, dat) => {
        if (err) { res.json({ status: error, msg: '数据库错误' }); return; }
        else { res.json({ status: 'success', msg: dat }); return; }
    })
})

router.get('/user/postAmount', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    let uid = 0;
    if (req.query.uid == undefined) uid = req.session.uid;
    else uid = req.query.uid;
    db.getUserPostAmount(uid, (err, dat) => {
        if (err) { res.json({ status: error, msg: '数据库错误' }); return; }
        else { res.json({ status: 'success', msg: dat }); return; }
    })
})

router.get('/user/info', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    let uid = 0;
    if (req.query.uid == undefined) uid = req.session.uid;
    else uid = req.query.uid;
    db.getUserInfo(uid, (err, dat) => {
        if (err) { res.json({ status: err, msg: '数据库错误' }); return; }
        else {
            let dat2;
            if (dat.bili_uid == 0) { dat2 = { id: dat.id, username: dat.username, type: dat.type, bili_uid: 0, bili_info: "" }; }
            else { dat2 = { id: dat.id, username: dat.username, type: dat.type, bili_uid: dat.bili_uid, bili_info: dat.bili_info }; }
            res.json({ status: 'success', msg: dat2 });
            return;
        }
    })
})

router.get('/user/name2id', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    let uname = req.query.uname;
    db.getUserId(uname, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: err }); return; }
        else {
            res.json({ status: 'success', msg: dat }); return;
        }
    })
})

// page(index)
router.post('/page', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getTypePost(0, req.body.page, 10, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: '超出范围' }); return; }
        else { res.json({ status: 'success', dat: dat }); return; }
    })
})

// sendpost
router.post('/post', function (req, res) {
    if (req.session.username == undefined) { res.json({ status: ('error'), msg: '请先登录' }); return; }
    if (req.body.content == undefined || req.body.content.trim().length == 0 || req.body.content.trim().length >= 20000) { res.json({ status: ('error'), msg: '内容长度不符合规范' }); return; }
    if (req.body.content.match(/[\u0600-\u06FF]/) != null) { res.json({ status: ('error'), msg: '包含不允许的阿拉伯字符' }); return; }
    if (req.body.type != 0) { res.json({ status: ('error'), msg: '类型错误' }); return; }
    db.getUserInfo(req.session.uid, (err, dat) => {
        if (err) { res.json({ status: ('error'), msg: '数据库错误' }); return; }
        if ((dat.bili_uid == 0 || !dat.bili_info || dat.bili_info == "" || JSON.parse(dat.bili_info).info.level < 2) && dat.type <= 0) { res.json({ status: ('error'), msg: '发布说说必须认证等级不小于2级的B站账号😀,认证请在个人主页中查找' }); return; }
        db.post(req.session.username, req.body.type, req.body.content.trim(), function (err, dat) {
            if (err) { res.json({ status: ('error'), msg: '数据库错误' }); return; }
            else { res.json({ status: ('success'), msg: '发送成功' }); return; }
        })
    })
});

router.post('/updatepost', function (req, res) {
    if (req.session.uid == undefined) { res.json({ status: ('error'), msg: '请先登录' }); return; }
    if (req.body.content == undefined || req.body.content.trim().length == 0 || req.body.content.trim().length >= 20000) { res.json({ status: ('error'), msg: '内容长度不符合规范' }); return; }
    if (req.body.content.match(/[\u0600-\u06FF]/) != null) { res.json({ status: ('error'), msg: '包含不允许的阿拉伯字符' }); return; }
    db.updatePost(req.body.pid, req.session.uid, req.body.content.trim(), function (err, dat) {
        if (err) { res.json({ status: ('error'), msg: err }); return; }
        else { res.json({ status: ('success'), msg: '修改成功' }); return; }
    })
})

// comment
router.get('/comment', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.query.pid == undefined || req.query.page == undefined || req.query.parent == undefined) { res.json({ status: 'error', msg: '非法请求' }); return; }
    db.getComment(req.query.pid, req.query.parent, req.query.page, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: '数据库错误' }); return; }
        else res.json({ status: 'success', dat: dat });
    })
})

router.post('/comment', function (req, res) {
    if (req.session.username == undefined) { res.json({ status: ('error'), msg: '请先登录' }); return; }
    if (req.body.comment == undefined || req.body.comment.trim().length == 0 || req.body.comment.trim().length >= 1000) { res.json({ status: ('error'), msg: '内容长度不符合规范' }); return; }
    if (req.body.pid == undefined || req.body.parent == undefined) { res.json({ status: ('error'), msg: '请求非法' }); return; }
    db.postCommentByUsername(req.body.pid, req.body.parent, req.session.username, req.body.comment.trim(), function (err, dat) {
        if (err) { res.json({ status: ('error'), msg: err }); console.error(err); return; }
        else {
            res.json({ status: ('success'), msg: '发送成功' });
            db.getPost(req.body.pid, (err, dat) => {
                if (err) return;
                else {
                    msg.emit('comment', dat, req.body.comment);
                    return;
                }
            })

        }
    })
})

router.get('/commentAmount', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    if (req.query.pid == undefined || req.query.parent == undefined) { res.json({ status: 'error', msg: '非法请求' }); return; }
    db.getCommentAmount(req.query.pid, req.query.parent, (err, dat) => {
        if (err) { res.json({ status: 'error', msg: '数据库错误' }); return; }
        else { res.json({ status: 'success', dat: dat }); return; }
    })
})

router.post('/getSourcePost', function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    db.getSourcePost(req.body.pid, (err, dat) => {
        if (err) { res.json({ 'status': 'error', 'msg': 'No Such User' }); return; }
        else { res.json({ 'status': 'success', 'msg': dat[0].content }); return; }
    })
})

router.post('/deletepost', function (req, res) {
    if (req.session.username == undefined) { res.json({ status: ('error'), msg: '请先登录' }); return; }
    db.deletePost(req.body.pid, req.session.uid, function (err, dat) {
        if (err) { res.json({ status: ('error'), msg: err }); return; }
        else { res.json({ status: ('success'), msg: '删除成功' }); return; }
    })
})

router.post('/post/sendfavor', function (req, res) {
    res.json({ status: ('error'), msg: '暂停点赞' }); return;
    if (req.session.username == undefined) { res.json({ status: ('error'), msg: '请先登录' }); return; }
    if (req.body.id == undefined) { res.json({ status: ('error'), msg: '非法请求' }); return; }
    db.sendPostLike(req.body.id, (err, dat) => {
        if (err) { res.json({ status: ('error'), msg: '数据库错误' }); return; }
        else { res.json({ status: ('success'), msg: '点赞成功' }); return; }
    })
})

// images
router.post('/upload/avatar', upload.single('avatar'), function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
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
    return;
})

router.post('/upload/banner', upload.single('banner'), function (req, res) {
    if (req.session.username == undefined) { res.redirect('/login'); return; }
    var imgType = req.file.mimetype; // 图片类型
    var url = "/tmp/Kana/upload/" + req.file.filename;
    if (imgType == "image/png" || imgType == "image/jpeg") {
        webp.cwebp(url, "/tmp/Kana/upload/" + req.file.filename.split(".")[0] + ".webp", "-q 80", function (status, error) {
            if (error) return false;
            img = req.file.filename.split(".")[0] + ".webp";
            var oldUrl = "/tmp/Kana/upload/" + req.file.filename; // 原文件地址
            fs.unlink(oldUrl, function (error) {
                if (error) return false;
                sharp('/tmp/Kana/upload/' + img)
                    .resize(1504, 376) //缩放
                    .toFile('/tmp/Kana/upload/' + img + '.webp')
                    .then(() => {
                        cos.uploadFile('/tmp/Kana/upload/', img + '.webp', '/img/user/banner/', req.session.uid + '.webp');
                        fs.unlink("/tmp/Kana/upload/" + img, () => { });
                        fs.unlink("/tmp/Kana/upload/" + img + '.webp', () => { });
                    })
            })
        })
    }
    res.send({ ret_code: '0' });
    return;
})

//superadmin

router.get('/superadmin/*', function (req, res, next) {
    db.getUserInfo(req.session.uid, (err, dat) => {
        if (err || !dat || !dat.type || dat.type <= 0 || dat.type >= 3) {
            next(createError(403));
            return;
        } else if (dat.type > 0 && dat.type < 4) {
            next();
        }
    })
})

router.post('/superadmin/*', function (req, res, next) {
    db.getUserInfo(req.session.uid, (err, dat) => {
        if (err || !dat || !dat.type || dat.type <= 0 || dat.type >= 4) {
            next(createError(403));
            return;
        } else if (dat.type > 0 && dat.type < 4) {
            next();
        }
    })
})

router.post('/superadmin/restart', function (req, res) {
    res.json({ status: 'success', msg: "重启中..." });
    cp.exec('sudo pm2 restart 0');
})

router.get('/captcha', function (req, res) {
    let captcha = svgCaptcha.create();
    req.session.captcha = captcha.text;

    res.type('svg');
    res.status(200).send(captcha.data);
});

// /*
router.get('/verify/bili/vcode', function (req, res) {
    if (req.session.uid == undefined) {
        res.json({ status: 'error' });
        return;
    }
    let biliVCode;
    db.runSQL('select bili_uid, bili_info from user where id=?', [req.session.uid], (err, dat) => {
        if (err || !dat) {
            res.json({ status: 'error' });
            return;
        }
        if (dat[0].bili_uid != 0) {
            res.json({ status: 'error', msg: '您已经完成认证' });
            return;
        }
        if (dat[0].bili_info == undefined || dat[0].bili_info == "" || JSON.parse(dat[0].bili_info).verified == true) {
            let vCodeNumber = parseInt(10000000 * Math.random()) + 114514;
            let vCode = `EE0000的第${vCodeNumber}个膜拜者`;
            db.runSQL('update user set bili_info=? where id=?', [JSON.stringify({ verified: false, biliVCode: vCode }), req.session.uid], (err) => {
                if (err) {
                    res.json({ status: 'error' });
                    return;
                }
            })
            biliVCode = vCode;
        } else {
            biliVCode = JSON.parse(dat[0].bili_info).biliVCode;
        }
        res.json({ status: 'success', msg: biliVCode, info: '使用方法:把B站个人简介改成这里的内容,然后等更新' });
    });
});

router.post('/verify/bili/delAuth', function (req, res) {
    if (req.session.uid == undefined) {
        res.json({ status: 'error' });
        return;
    }
    db.runSQL('update user set bili_info="", bili_uid=0 where id=?', [req.session.uid], (err) => {
        if (err) {
            console.log(err);
            res.json({ status: 'error' });
            return;
        }
        else {
            res.json({ status: 'success' });
            return;
        }
    })
})

router.post('/verify/bili/auth', function (req, res) {
    if (req.session.uid == undefined || isNaN(req.body.bili_uid)) {
        res.json({ status: 'error' });
        return;
    }
    db.runSQL('select id,bili_uid from user where bili_uid=?', [req.body.bili_uid], (err, dat) => {
        if (err || dat[0] != undefined) {
            res.json({ status: 'error', msg: '该账号已认证' });
            return;
        }
        db.runSQL('select bili_uid, bili_info from user where id=?', [req.session.uid], (err, dat) => {
            if (err || !dat) {
                res.json({ status: 'error' });
                return;
            }
            if (dat[0].bili_uid != 0) {
                res.json({ status: 'error', msg: '您已经完成认证' });
                return;
            }
            let https = require("https");
            let url = `https://api.bilibili.com/x/space/acc/info?mid=${req.body.bili_uid}&jsonp=jsonp`;
            https.get(url, function (_res) {
                var html = '';
                // 绑定data事件 回调函数 累加html片段
                _res.on('data', function (data) {
                    html += data;
                });

                _res.on('end', function () {
                    let info = JSON.parse(html).data;
                    let sign = info.sign;
                    if (sign != JSON.parse(dat[0].bili_info).biliVCode) {
                        res.json({ status: 'error', msg: 'vCode 不匹配' });
                        return;
                    }
                    else {
                        db.runSQL('update user set bili_info=?, bili_uid=? where id=?', [JSON.stringify({ verified: true, info: info }), req.body.bili_uid, req.session.uid], (err) => {
                            if (err) {
                                res.json({ status: 'error', msg: '数据库错误' });
                                return;
                            }
                            res.json({ status: 'success', msg: '认证成功' });
                            return;
                        })
                    }
                });
            }).on('error', function () {
                res.json({ status: 'error', msg: 'Server network error' });
                return;
            });
        });

    })
});

// */

router.post('/template', function (req, res) {
    res.json({
        'status': 'success', 'msg': `
    <% var username = $("#usercard-name")[0].innerHTML.slice(1); %>
    <% function dateFtt(fmt,date){var o={"M+":date.getMonth()+1,"d+":date.getDate(),"h+":date.getHours(),"m+":date.getMinutes(),"s+":date.getSeconds(),"q+":Math.floor((date.getMonth()+3)/3),"S":date.getMilliseconds()};if(/(y+)/.test(fmt))fmt=fmt.replace(RegExp.$1,(date.getFullYear()+"").substr(4-RegExp.$1.length));for(var k in o)if(new RegExp("("+k+")").test(fmt))fmt=fmt.replace(RegExp.$1,(RegExp.$1.length==1)?(o[k]):(("00"+o[k]).substr((""+o[k]).length)));return fmt} %>
    <% function delta(time){var interval=new Date().getTime()-time;var returnTime="";var years=Math.floor(interval/(365*24*3600*1000));if(years==0){var months=Math.floor(interval/(30*24*3600*1000));if(months==0){var days=Math.floor(interval/(24*3600*1000));if(days==0){var leaveTime=interval%(24*3600*1000);var hours=Math.floor(leaveTime/(3600*1000));if(hours==0){leaveTime=leaveTime%(3600*1000);var minutes=Math.floor(leaveTime/(60*1000));if(minutes==0){leaveTime=leaveTime%(60*1000);var seconds=Math.round(leaveTime/1000);return seconds+"秒前"}return minutes+"分钟前"}return hours+"小时前"}return days+"天前"}return months+"月前"}return years+"年前"} %> 

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
