var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var session = require('express-session');
var xss = require('xss');
var pako = require('pako');
var CronJob = require('cron').CronJob;
var MySQLStore = require('express-mysql-session')(session);
var MarkdownIt = require('markdown-it'),
    md = new MarkdownIt({
        breaks: true,
        linkify: true,
        html: true,
        xhtmlOut: true,
    });
var stringRandom = require('string-random');

require('events').EventEmitter.defaultMaxListeners = 50;

var connection;
var sessionStore;

function handleError() {
    connection = eval(require('../config').db_data);

    sessionStore = new MySQLStore({
        expiration: 86400000,
        createDatabaseTable: true,  //是否创建表
        schema: {
            tableName: 'session',   //表名
            columnNames: {      //列选项
                session_id: 'session_id',
                expires: 'expires',
                data: 'data'
            }
        }
    }, connection);

    //连接错误，2秒重试
    connection.connect(function (err, dat) {
        if (err) {
            console.log('error when connecting to db:', err);
            connection.destroy();
            setTimeout(handleError, 2000);
        }
    });

    connection.on('error', function (err) {
        console.log('db error', err);
        // 如果是连接断开，自动重新连接
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connection.destroy();
            handleError();
        } else {
            throw err;
        }
    });
}

handleError();

function renderMD(content) {
    content = xss(md.render(content));
    content = content.replace(/\[at,uid=([0-9]{1,10})\]/g, (match, key) => {
        if (isNaN(Number(key))) return match;
        else { return "<a class='user at unfinish' href='/user/" + Number(key) + "' uid='" + Number(key) + "'>@</a>"; }
    });
    content = content.replace(/\[gp\]/g, '<img src="/img/gp.png" class="gp">');
    content = content.replace(/\[gr\]/g, '<img src="/img/gr.png" class="gr">');
    return content;
}

function login(username, password, ip, callback) {
    password = String(password);
    username = String(username);
    for (var i = 1; i <= 10; ++i)
        password = crypto.createHash('md5').update("114514" + password + 'encryptionKana').digest("hex");
    let SQL = 'SELECT * FROM `user` WHERE BINARY username=? AND BINARY password=?';
    let SQLDATA = [username, password];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        if (results == 0) { callback(null, [-1, '错误的用户名或密码', { username: "ERRUSER", id: -1 }]); return; }
        else {
            callback(null, [0, '成功登录', { username: results[0].username, id: results[0].id }]);
            let SQL2 = 'UPDATE `user` SET `last_login_ip`=? WHERE username=?';
            let SQL2DATA = [ip, username];
            connection.query(SQL2, SQL2DATA, () => { });
            return;
        }
    });
}

function register(username, password, ip, callback) {
    password = String(password);
    username = String(username);
    if (username.indexOf('<') != -1 || username.length < 3 || username.length > 16) {
        callback(null, [-2, '用户名不能小于3位或超过16位且不能包含"<"与">"']);
        return;
    } else if (password.length < 8) {
        callback(null, [-2, '密码不能小于八位']);
        return;
    }
    for (var i = 1; i <= 10; ++i)
        password = crypto.createHash('md5').update("114514" + password + 'encryptionKana').digest("hex")
    username = String(username), password = String(password);
    var SQL = 'SELECT * FROM `user` WHERE username=?';
    var SQLDATA = [username];

    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback('error'); return; }
        if (results == 0) {
            SQL = "INSERT INTO user (`username`, `password`, `exp`, `rating`, `last_login_ip`) VALUES (?, ?, 0, 0, ?)";
            SQLDATA = [username, password, ip];
            connection.query(SQL, SQLDATA, function (error, results) {
                if (error) { callback('error'); return; }
                else getUserId(username, function (err, dat) {
                    if (err) { callback(err); return; }
                    callback(null, [0, "注册成功", dat]);
                    return;
                })
            });
        }
        else { callback(null, [-1, "该用户名已被注册"]); return; }
    });
}

function modifyExp(uid, amount, callback) {
    var SQL = 'UPDATE `user` SET exp=exp+? WHERE id=?';
    var SQLDATA = [amount, uid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        var SQL = 'SELECT * FROM `user` WHERE id=?';
        var SQLDATA = [uid];
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) { callback(error); return; }
            else { callback(null, [0, '', { exp: results[0].exp }]); return; }
        });
    });
}

function querySubmission(uid, callback) {
    var SQL = 'SELECT * FROM `submission` WHERE uid=? ORDER BY time DESC';
    var SQLDATA = [uid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, [0, results]);
        return;
    });
}

function addSubmission(uid, dat, callback) {
    var SQL = 'INSERT INTO `submission`(`data`, `uid`) VALUES (?,?)';
    var SQLDATA = [uid, dat];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, [0]);
        return;
    });
}

function getTypePost(type, page, pagesize, callback) {
    let SQL = `select * from content where type=? AND hidden=0 order by id desc limit ?,?;`
    let SQLDATA = [type, (page - 1) * pagesize, pagesize];
    let SQL2 = `UPDATE content SET view=view+1 where id in (SELECT t.id FROM (SELECT * FROM content WHERE type=? AND hidden=0 order by id desc limit ?,?) as t);`
    let SQLDATA2 = [type, (page - 1) * pagesize, pagesize];
    connection.query(SQL2, SQLDATA2, (err) => {
        if (err) console.error(err);
    })
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        let finish = 0;
        results.forEach(e => {
            e.content = renderMD(e.content);
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) { callback(err); return; }
                e.comment = dat;
                finish++;
                if (finish == results.length * 2) { callback(null, results); return; }
            });
            getUserInfo(e.user_id, function (err, dat) {
                if (err) { callback(err); return; }
                e.userinfo = dat;
                e.level = getLevelByExp(dat.exp);
                delete e.userinfo.password;
                finish++;
                if (finish == results.length * 2) { callback(null, results); return; }
            })
        })
        if (results == 0)
            callback(null, results);
        return;
    });
}

function getPostStatus(pid, callback) {
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        let result = results[0];
        if (error) { callback(error, null); return; }
        if (result == undefined) { callback('被删除'); return; }
        callback(null, result);
        return;
    });
}

function getPost(pid, callback) {
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        let SQL2 = `UPDATE content SET view=view+1 WHERE id=?;`
        connection.query(SQL2, SQLDATA, (err) => {
            if (err) console.error(err);
        })
        let result = results[0];
        if (error) { callback(error, null); return; }
        if (result == undefined) { callback('被删除'); return; }
        result.content = renderMD(result.content);
        callback(null, result);
        return;
    });
}

function getSourcePost(pid, callback) {
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error, results); return; }
        callback(null, results[0]);
        return;
    });
}

function updatePost(pid, uid, content, callback) {
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    getUserInfo(uid, (err, dat) => {
        if (err) { callback("数据库错误", null); return; }
        connection.query(SQL, SQLDATA, function (error, results) {
            if (uid != results[0].user_id && dat.type <= 0) { callback("Permission Denied", null); return; }
            var SQL = `UPDATE content SET content=? WHERE id=?;`
            var SQLDATA = [content, pid];
            connection.query(SQL, SQLDATA, function (error, results) {
                if (error) { callback(error, null); return; }
                callback(null, "成功修改");
                return;
            });
        });
    })
}

function deletePost(pid, uid, callback) {
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    getUserInfo(uid, (err, dat) => {
        if (err) { callback("数据库错误", null); return; }
        connection.query(SQL, SQLDATA, function (error, results) {
            if (results == undefined || results[0] == undefined || uid != results[0].user_id && (dat.type <= 0 || dat.type >= 5)) { callback("Permission Denied", null); return; }
            var SQL = `UPDATE content SET hidden=? WHERE id=?;`
            var SQLDATA = [true, pid];
            connection.query(SQL, SQLDATA, function (error, results) {
                if (error) { callback(error, null); return; }
                callback(null, "成功删除");
                let SQL2 = `select * from content where id=?`;
                let SQLDATA2 = [pid];
                connection.query(SQL2, SQLDATA2, function (err, dat) {
                    if (err) return;
                    addUserExperienceById(dat[0].user_id, -10);
                })
            });
        });
    });
}

function getUserPost(uid, page, pagesize, callback) {
    page = Number(page);
    var SQL = `select * from content where user_id=? AND hidden=0 order by id desc limit ?,?;`
    var SQLDATA = [uid, (page - 1) * pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        let finish = 0;
        if (results.length == 0) { callback(null, results); return; }
        results.forEach(e => {
            e.content = renderMD(e.content);
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) callback(err);
                e.comment = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                    return;
                }
            });
            getUserInfo(e.user_id, function (err, dat) {
                if (err) { callback(err); return; }
                e.userinfo = dat;
                e.level = getLevelByExp(dat.exp);
                delete e.userinfo.password;
                finish++;
                if (finish == results.length * 2) { callback(null, results); return; }
            })
        })
    });
}

function getUserPostByPID(uid, PID, pagesize, callback) {
    PID = Number(PID);
    let SQL = ""; let SQLDATA = [];
    if (uid == 1) SQL = `select * from content where hidden=0 AND id<? order by id desc limit 0,?;`, SQLDATA = [PID, pagesize];
    else SQL = `select * from content where user_id=? AND hidden=0 AND id<? order by id desc limit 0,?;`, SQLDATA = [uid, PID, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        let finish = 0;
        if (results.length == 0) { callback(null, results); return; }
        results.forEach(e => {
            e.content = renderMD(e.content);
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) { callback(err); return; }
                e.comment = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                    return;
                }
            });
            getUserLevelById(e.user_id, function (err, dat) {
                if (err) { callback(err); return; }
                e.level = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                    return;
                }
            })
        })
    });
}

function getUserSourcePost(uid, page, pagesize, callback) {
    page = Number(page);
    var SQL = `select * from content where user_id=? AND hidden=0 order by id desc limit ?,?;`
    var SQLDATA = [uid, (page - 1) * pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, results);
        return;
    });
}

function getUserId(username, callback) {
    var SQL = 'SELECT * FROM `user` WHERE username=?';
    var SQLDATA = [username];

    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        if (results[0] != undefined) { callback(null, results[0].id); return; }
        else { callback("No Such User", null); return; }
    });
}

function getUsername(userid, callback) {
    var SQL = 'SELECT * FROM `user` WHERE id=?';
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        if (results[0] != undefined) { callback(null, results[0].username); return; }
        else { callback("No Such User", null); return; }
    });
}

function getUserInfo(userid, callback) {
    var SQL = `SELECT * FROM user WHERE id=?`;
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error || results.length == 0) { callback('No Such User'); return; }
        else {
            if (results[0] == undefined) { callback('No Such User', null); return; }
            else getUserCommentAmount(userid, (err, dat) => {
                if (err) { callback(err); return; }
                else {
                    results[0].comment = dat;
                    getUserPostAmount(userid, (err, dat) => {
                        results[0].post = dat;
                        callback(null, results[0]);
                        return;
                    })
                }

            })
        }

    });
}

function getUserExperienceById(userid, callback) {
    getUserInfo(userid, function (err, dat) {
        if (err) { callback(err, null); return; }
        else { callback(null, dat.exp); return; }
    })
}

function getUserExperienceByUsername(username, callback) {
    getUserId(username, function (err, userid) {
        getUserInfo(userid, function (err, dat) {
            if (err) { callback(err, null); return; }
            else { callback(null, dat.exp); return; }
        })
    })
}

function getLevelByExp(exp) {
    return ((exp >= 28800) ? 6 : ((exp >= 10800) ? 5 : ((exp >= 4500) ? 4 : ((exp >= 1500) ? 3 : ((exp >= 200 ? 2 : ((exp >= 100) ? 1 : 0)))))));
}

function getUserLevelById(userid, callback) {
    getUserExperienceById(userid, function (err, dat) {
        if (err) { callback(err); return; }
        else { callback(null, getLevelByExp(dat)); return; }
    });
}

function getUserLevelByUsername(username, callback) {
    getUserId(username, (err, dat) => {
        if (err) { callback(err); return; }
        else {
            getUserExperienceById(dat, function (err, dat) {
                if (err) { callback(err); return; }
                else { callback(null, ((dat >= 28800) ? 6 : ((dat >= 10800) ? 5 : ((dat >= 4500) ? 4 : ((dat >= 1500) ? 3 : ((dat >= 200 ? 2 : ((dat >= 100) ? 1 : 0)))))))); return; }
            });
        }
    })
}

function addUserExperienceById(userid, exp, callback = () => { }) {
    var SQL = 'UPDATE `user` SET `exp`= `exp` + ? WHERE id=?';
    var SQLDATA = [exp, userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, 'success');
        return;
    });
}

function addUserExperienceByUsername(username, exp, callback = () => { }) {
    getUserId(username, function (err, dat) {
        if (err) { callback(err); return; }
        else {
            addUserExperienceById(dat, exp, callback);
            return;
        }
    });
}

function post(username, type, content, callback = () => { }) {
    if (username == undefined || username.length <= 2) return;
    var SQL = `INSERT INTO content(type, user_id, user_name, content, hidden)
    VALUES (?, ?, ?, ?, 0)`;
    getUserId(username, (err, dat) => {
        if (err) { callback(error); return; }
        var SQLDATA = [type, dat, username, content];
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) { callback(error); return; }
            else callback(null, [0]);
        });
        addUserExperienceById(dat, 10);
    })
}

function getComment(pid, parent, page, callback = () => { }) {
    let pagesize = 10;
    let SQL = 'SELECT * FROM `comment` WHERE pid=? AND parent=? order by id desc limit ?,?;';
    let SQLDATA = [pid, parent, (page - 1) * pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) { callback(err); return; }
        else { callback(null, JSON.parse(JSON.stringify(dat))); return; }
    })
}

function getUserPostAmount(uid, callback) {
    let SQL = 'SELECT COUNT(*) as total FROM `content` WHERE user_id=? AND hidden=0';
    let SQLDATA = [uid];
    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) { callback(err); return; }
        else { callback(null, dat[0].total); return; }
    })
}

function getCommentAmount(pid, parent, callback = () => { }) {
    let SQL = '';
    let SQLDATA = '';
    if (parent != -1) {
        SQL = 'SELECT COUNT(*) as total FROM `comment` WHERE pid=? AND parent=?;';
        SQLDATA = [pid, parent];
    } else {
        SQL = 'SELECT COUNT(*) as total FROM `comment` WHERE pid=?;';
        SQLDATA = [pid];
    }

    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) { callback(err); return; }
        else { callback(null, dat[0].total); return; }
    })
}

function getUserCommentAmount(uid, callback = () => { }) {
    let SQL = 'SELECT COUNT(*) as total FROM `comment` WHERE uid=?;';
    let SQLDATA = [uid];

    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) { callback(err); return; }
        else { callback(null, dat[0].total); return; }
    })
}

function postCommentByUsername(pid, parent, uname, comment, callback = () => { }) {
    let SQL = 'INSERT INTO `comment`(`pid`, `parent`, `uid`, `username`, `comment`) \
    VALUES (?, ?, ?, ?, ?)';
    if (comment.length <= 0) { callback("评论长度有误"); return; }
    getPostStatus(pid, (err, dat) => {
        if (err) { callback('说说被删除或尚未发布.'); return; }
        else {
            getUserId(uname, function (err, dat) {
                if (err) { callback(err); return; }
                let SQLDATA = [pid, parent, dat, uname, comment];
                connection.query(SQL, SQLDATA, function (err, dat) {
                    if (err) { callback(err); return; }
                    else { callback(null, "success"); return; }
                })
            })
        }
    })
}

function sendPostLike(pid, callback) {
    let SQL = 'UPDATE `content` SET `favor`=`favor`+1 WHERE id=? AND hidden=0';
    let SQLDATA = [pid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { console.error(err); callback(err); return; }
        else { callback(null, "success"); return; }
    })
}

function sendCommentLike(cid, callback) {
    let SQL = 'UPDATE `comment` SET `favor`=`favor`+1 WHERE id=? AND hidden=0';
    let SQLDATA = [cid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { console.error(err); callback(err); return; }
        else { callback(null, "success"); return; }
    })
}

// FOR GAME

function getRating(uid, callback = () => { }) {
    getUserInfo(uid, (err, dat) => {
        if (err) { callback(err); return; }
        else { callback(null, dat.rating); return; }
    })
}

function addBattle(uid, battle_id, dr) {
    console.log('addBattle', uid, battle_id, dr);
    let SQL = 'INSERT INTO `battle`(`battle_id`, `player`, `rating`, `delta_rating`) VALUES (?, ?, ?, ?)'
    getRating(uid, (err, dat) => {
        if (err) {
            console.log('addBattleError:', e);
        }
        else try {
            let SQLDATA = [battle_id, uid, dat, dr];
            connection.query(SQL, SQLDATA, (err, dat) => {
                if (err) { console.error(err); }
            });
        } catch (e) {
            console.log('addBattleError:', e);
        }
    })
}

function addBattleData(battle_id, data) {
    let SQL = 'INSERT INTO `battle_data`(`battle_id`, `battle_data`) VALUES (?, ?)'
    let deflate = new pako.Deflate({ level: 9 });
    deflate.push(data, true);
    var buf = Buffer.from(deflate.result)
    let SQLDATA = [battle_id, buf];
    connection.query(SQL, SQLDATA, (err) => { console.log(err); });
}

function changeRating(uid, rating, nowRating, isRated) {
    let SQL = 'UPDATE `user` SET `rating`=`rating`+? WHERE `id`=?;'
    if (rating > 0) rating = Math.round(rating * (Math.abs(49.5 - 0.01 * nowRating) + 50.5 - 0.01 * nowRating) / 10);
    else rating = rating * Math.round(0.002 * nowRating + 1);
    if (!isRated) rating = 0;
    let SQLDATA = [rating, uid];
    try {
        connection.query(SQL, SQLDATA, (err, dat) => { });
    } catch (e) {
        console.log('changeRatingError:', e);
    }
    return rating;
}

function gameRatingCalc(room, data, battle_data, isRated) {
    try {
        let bid = stringRandom(64);
        let firstAmount = 0;
        let firstRating = -1;
        let firstBounce = 0;
        let cnt = 0;
        if (Object.keys(data).length == 0) return;
        addBattleData(bid, battle_data);
        for (let j in data) {
            getRating(j, (err, dat) => {
                if (err) { console.log('gameRatingCalc', err); return; }
                else {
                    data[j].rating = Number(dat);
                    if (data[j].place == 1) { ++firstAmount; firstRating = Math.max(firstRating, data[j].rating); }
                }
                ++cnt;
                if (cnt == Object.keys(data).length) {
                    for (let k in data) {
                        if (data[k].place == 1) continue;
                        let score = Math.round((data[k].rating - firstRating) / 1000) + 3;
                        if (score <= 0) score = 1;
                        if (score > 10) score = 10;
                        firstBounce += score;
                        let deltaRating = changeRating(k, -score, data[k].rating, isRated);
                        addBattle(k, bid, deltaRating);
                    }
                    for (let k in data) {
                        if (data[k].place != 1) continue;
                        let deltaRating = changeRating(k, firstBounce / firstAmount, data[k].rating, isRated);
                        addBattle(k, bid, deltaRating);
                    }
                }
            })
        }
    } catch (e) {
        console.log("GRC", e);
    }
}

let rating = undefined;
function getRatingList() {
    let SQL = 'SELECT * FROM `user` ORDER BY `rating` DESC, `exp` DESC LIMIT 100';
    connection.query(SQL, [], (err, dat) => {
        let ips = [];
        let ret = [];
        for (let i = 0; i < dat.length; ++i) {
            let e = dat[i];
            if (e.last_login_ip != '0.0.0.0' && ips.indexOf(e.last_login_ip) == -1) {
                ips.push(e.last_login_ip);
                ret.push(e);
                if (ret.length >= 10) {
                    rating = ret; return rating;
                }
            }
        }
        rating = ret;
    });
    return rating;
}
getRatingList();

function getUserBattle(uid, page, callback) {
    let SQL = "";
    if (uid != 1)
        SQL = 'SELECT * FROM `battle` WHERE player=? ORDER BY id DESC LIMIT ?, 20';
    else SQL = 'SELECT * FROM `battle` WHERE (1 OR player=?) ORDER BY id DESC LIMIT ?, 100';
    let SQLDATA = [uid, (--page) * 10];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { callback(err); return; }
        else { callback(null, dat); return; }
    })
}

function getReplay(rid, callback) {
    let SQL = 'SELECT * FROM `battle_data` WHERE battle_id=?;';
    let SQLDATA = [rid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { callback(err); return; }
        else { console.log( pako.inflate(new Uint8Array(dat[0].battle_data), {to: 'string'})); callback(null, pako.inflate(new Uint8Array(dat[0].battle_data), {to: 'string'})); return; }
    })
}

// 每天自动减Rating, 取消了

// new CronJob('0 0 0 * * *', function () {
//     let SQL = 'UPDATE `user` SET `rating`=`rating`*0.8 WHERE 1';
//     connection.query(SQL, [], () => { });
// }, null, true);

// Ban

function setBan(uid, time, callback) {
    let SQL = 'UPDATE `user` SET `ban_type`=1, `ban_time`=date_add(now(), interval ? second) WHERE id=?';
    let SQLDATA = [time * 3600, uid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { callback(err, null); return; }
        else { callback(null, dat); return; }
    })
}

function cancelBan(uid, callback) {
    let SQL = 'UPDATE `user` SET `ban_type`=0, `ban_time`=now() WHERE id=?';
    let SQLDATA = [uid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) { callback(err, null); return; }
        else { callback(null, dat); return; }
    })
}

module.exports = {
    sessionStore,
    login, register,
    getUsername, getUserId, getUserInfo, getUserLevelById,
    getUserLevelByUsername, getUserExperienceById, getUserExperienceByUsername,
    modifyExp, addUserExperienceById, addUserExperienceByUsername,
    post, getPost, getSourcePost, getTypePost, getUserPost, updatePost, deletePost, getUserSourcePost, getUserPostByPID,
    querySubmission, addSubmission,
    getComment, postCommentByUsername, getCommentAmount,
    getUserPostAmount, getUserCommentAmount,
    gameRatingCalc, getRatingList, getUserBattle, getReplay,
    sendPostLike,
    setBan, cancelBan
}