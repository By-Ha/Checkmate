var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var session = require('express-session');
var xss = require('xss');
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

function login(username, password, callback) {
    password = String(password);
    username = String(username);
    for (var i = 1; i <= 10; ++i)
        password = crypto.createHash('md5').update("114514" + password + 'encryptionKana').digest("hex");
    var SQL = 'SELECT * FROM `user` WHERE BINARY username=? AND BINARY password=?';
    var SQLDATA = [username, password];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) callback(error);
        if (results == 0) callback(null, [-1, '错误的用户名或密码', { username: "ERRUSER", id: -1 }]);
        else callback(null, [0, '成功登录', { username: results[0].username, id: results[0].id }])
    });
}

function register(username, password, callback) {
    password = String(password);
    username = String(username);
    if (username.indexOf('<') != -1 || username.length < 3) {
        callback(null, [-2, '用户名不能小于3位且不能包含"<"号']);
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
        if (error) callback('error');
        if (results == 0) {
            SQL = "INSERT INTO user (`username`, `password`, `exp`, `rating`) VALUES (?, ?, 0, 0)";
            SQLDATA = [username, password];
            connection.query(SQL, SQLDATA, function (error, results) {
                if (error) callback('error');
                else getUserId(username, function (err, dat) {
                    if (err) callback(err);
                    callback(null, [0, "注册成功", dat]);
                })
            });
        }
        else callback(null, [-1, "该用户名已被注册"]);;
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
            if (error) callback(error);
            else callback(null, [0, '', { exp: results[0].exp }])
        });
    });
}

function querySubmission(uid, callback) {
    var SQL = 'SELECT * FROM `submission` WHERE uid=? ORDER BY time DESC';
    var SQLDATA = [uid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, [0, results]);
    });
}

function addSubmission(uid, dat, callback) {
    var SQL = 'INSERT INTO `submission`(`data`, `uid`) VALUES (?,?)';
    var SQLDATA = [uid, dat];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        callback(null, [0]);
    });
}

function getTypePost(type, page, pagesize, callback) {
    var SQL = `select * from content where type=? AND hidden=0 order by user_id=1 desc,id desc limit ?,?;`
    var SQLDATA = [type, (page - 1) * pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        let finish = 0;
        results.forEach(e => {
            e.content = xss(md.render(e.content));
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) callback(err);
                e.comment = dat;
                finish++;
                if (finish == results.length * 2) { callback(null, results); return; }
            });
            getUserLevelById(e.user_id, function (err, dat) {
                if (err) callback(err);
                e.level = dat;
                finish++;
                if (finish == results.length * 2) { callback(null, results); return; }
            })
        })
        callback(null, results);
    });
}

function getPost(pid, callback) {
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        let result = results[0];
        if (error) {
            callback(error, null);
            return;
        }
        if (result == undefined) {
            callback('被删除');
            return;
        }
        result.content = xss(md.render(result.content));
        callback(null, result);
    });
}

function getSourcePost(pid, callback) {
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) callback(error, results);
        callback(null, results[0]);
    });
}

function updatePost(pid, username, content, callback) {
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (username != results[0].user_name && username != "admin") {
            callback("Permission Denied", null);
            return;
        }
        var SQL = `UPDATE content SET content=? WHERE id=?;`
        var SQLDATA = [content, pid];
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, "成功修改");
        });
    });
}

function deletePost(pid, username, callback) {
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (username != results[0].user_name && username != "admin") {
            callback("Permission Denied", null);
            return;
        }
        var SQL = `UPDATE content SET hidden=? WHERE id=?;`
        var SQLDATA = [true, pid];
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, "成功删除");
            let SQL2 = `select * from content where id=?`;
            let SQLDATA2 = [pid];
            connection.query(SQL2, SQLDATA2, function (err, dat) {
                if (err) return;
                addUserExperienceById(dat[0].user_id, -10);
            })

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
        if (results.length == 0) callback(null, results);
        results.forEach(e => {
            e.content = xss(md.render(e.content));
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) callback(err);
                e.comment = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                }
            });
            getUserLevelById(e.user_id, function (err, dat) {
                if (err) callback(err);
                e.level = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                }
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
        if (results.length == 0) callback(null, results);
        results.forEach(e => {
            e.content = xss(md.render(e.content));
            getCommentAmount(e.id, -1, function (err, dat) {
                if (err) callback(err);
                e.comment = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
                }
            });
            getUserLevelById(e.user_id, function (err, dat) {
                if (err) callback(err);
                e.level = dat;
                finish++;
                if (finish == (results.length * 2)) {
                    callback(null, results);
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
    });
}

function getUserId(username, callback) {
    var SQL = 'SELECT * FROM `user` WHERE username=?';
    var SQLDATA = [username];

    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        if (results[0] != undefined)
            callback(null, results[0].id);
        else callback("No Such User", null);
    });
}

function getUsername(userid, callback) {
    var SQL = 'SELECT * FROM `user` WHERE id=?';
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback(error); return; }
        if (results[0] != undefined)
            callback(null, results[0].username);
        else callback("No Such User", null);
    });
}

function getUserInfo(userid, callback) {
    var SQL = `SELECT * FROM user WHERE id=?`;
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error || results.length == 0) callback('No Such User');
        else {
            if (results[0] == undefined) callback('No Such User', null);
            else getUserCommentAmount(userid, (err, dat) => {
                if (err) callback(err);
                else {
                    results[0].comment = dat;
                    getUserPostAmount(userid, (err, dat) => {
                        results[0].post = dat;
                        callback(null, results[0]);
                    })
                }

            })
        }

    });
}

function getUserExperienceById(userid, callback) {
    getUserInfo(userid, function (err, dat) {
        if (err) callback(err, null);
        else callback(null, dat.exp);
    })
}

function getUserExperienceByUsername(username, callback) {
    getUserId(username, function (err, userid) {
        getUserInfo(userid, function (err, dat) {
            if (err) callback(err, null);
            else callback(null, dat.exp);
        })
    })
}

function getUserLevelById(userid, callback) {
    getUserExperienceById(userid, function (err, dat) {
        if (err) callback(err);
        else callback(null, ((dat >= 28800) ? 6 : ((dat >= 10800) ? 5 : ((dat >= 4500) ? 4 : ((dat >= 1500) ? 3 : ((dat >= 200 ? 2 : ((dat >= 100) ? 1 : 0))))))));
    });
}

function getUserLevelByUsername(username, callback) {
    getUserId(username, (err, dat) => {
        if (err) callback(err);
        else {
            getUserExperienceById(dat, function (err, dat) {
                if (err) callback(err);
                else callback(null, ((dat >= 28800) ? 6 : ((dat >= 10800) ? 5 : ((dat >= 4500) ? 4 : ((dat >= 1500) ? 3 : ((dat >= 200 ? 2 : ((dat >= 100) ? 1 : 0))))))));
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
    });
}

function addUserExperienceByUsername(username, exp, callback = () => { }) {
    getUserId(username, function (err, dat) {
        if (err) callback(err);
        else {
            addUserExperienceById(dat, exp, callback);
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
            callback(null, [0]);
        });
        addUserExperienceById(dat, 10);
    })
}

function getComment(pid, parent, page, callback = () => { }) {
    let pagesize = 10;
    let SQL = 'SELECT * FROM `comment` WHERE pid=? AND parent=? order by id desc limit ?,?;';
    let SQLDATA = [pid, parent, (page - 1) * pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) callback(err);
        else callback(null, JSON.parse(JSON.stringify(dat)));
    })
}

function getUserPostAmount(uid, callback) {
    let SQL = 'SELECT COUNT(*) as total FROM `content` WHERE user_id=? AND hidden=0';
    let SQLDATA = [uid];
    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) callback(err);
        else callback(null, dat[0].total);
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
        if (err) callback(err);
        else callback(null, dat[0].total);
    })
}

function getUserCommentAmount(uid, callback = () => { }) {
    let SQL = 'SELECT COUNT(*) as total FROM `comment` WHERE uid=?;';
    let SQLDATA = [uid];

    connection.query(SQL, SQLDATA, function (err, dat) {
        if (err) callback(err);
        else callback(null, dat[0].total);
    })
}

function postCommentByUsername(pid, parent, uname, comment, callback = () => { }) {
    let SQL = 'INSERT INTO `comment`(`pid`, `parent`, `uid`, `username`, `comment`) \
    VALUES (?, ?, ?, ?, ?)';
    if (comment.length <= 2) {
        callback("评论长度有误");
        return;
    }
    getUserId(uname, function (err, dat) {
        if (err) {
            callback(err);
            return;
        }
        let SQLDATA = [pid, parent, dat, uname, comment];
        connection.query(SQL, SQLDATA, function (err, dat) {
            if (err) callback(err);
            else callback(null, "success");
        })
    })
}

function getRating(uid, callback = () => { }) {
    getUserInfo(uid, (err, dat) => {
        if (err) callback(err);
        else callback(null, dat.rating);
    })
}

function addBattle(uid, battle_id, dr) {
    console.log('ADD_BATTLE', uid, battle_id);
    let SQL = 'INSERT INTO `battle`(`battle_id`, `player`, `rating`, `delta_rating`) VALUES (?, ?, ?, ?)'
    getRating(uid, (err, dat) => {
        if (err) {
            console.log('addBattleError:', e);
        }
        else try {
            let SQLDATA = [battle_id, uid, dat, dr];
            connection.query(SQL, SQLDATA, () => { });
        } catch (e) {
            console.log('addBattleError:', e);
        }
    })
}

function addBattleData(battle_id, data) {
    let SQL = 'INSERT INTO `battle_data`(`battle_id`, `battle_data`) VALUES (?, ?)'
    let SQLDATA = [battle_id, data];
    connection.query(SQL, SQLDATA, () => { });
}

function changeRating(uid, rating) {
    console.log('RATING_CHANGE', uid, rating);
    let SQL = 'UPDATE `user` SET `rating`=`rating`+? WHERE `id`=?;'
    let SQLDATA = [rating, uid];
    try {
        connection.query(SQL, SQLDATA, (err, dat) => { });
    } catch (e) {
        console.log('changeRatingError:', e);
    }

}

function gameRatingCalc(data, battle_data) {
    console.log("PLACE_DATA:", data);
    try {
        let bid = stringRandom(64);
        let amount = 0;
        let p = [];
        if (Object.keys(data).length == 0) return;
        addBattleData(bid, battle_data);
        for (let k in data) {
            getRating(k, (err, dat) => {
                if (err) { console.log('gameRatingCalc', err); return; }
                else {
                    data[k].rating = Number(dat);
                    p[Number(data[k].place)] = k;
                    amount++;
                    if (amount == Object.keys(data).length) {
                        let firstRating = data[p[1]].rating;
                        let firstBounce = 0;
                        for (let it = 2; it <= Object.keys(data).length; ++it) {
                            try {
                                if (data[p[it]].rating >= firstRating) {
                                    firstBounce += Math.ceil((data[p[it]].rating - firstRating) / 100) + 3;
                                    let dr = -5 - 1 * Math.min(Math.ceil((data[p[it]].rating - firstRating) / 100), 8);
                                    changeRating(p[it], dr);
                                    addBattle(p[it], bid, dr);
                                } else {
                                    firstBounce += Math.max(3 - Math.ceil((firstRating - data[p[it]].rating) / 100), 1);
                                    let dr = -1 * Math.max(Math.floor(5 - (firstRating - data[p[it]].rating) / 100), 1);
                                    changeRating(p[it], dr);
                                    addBattle(p[it], bid, dr);
                                }
                            } catch (e) {
                                console.log('it:', it, '\np:', p, '\ndata:', data);
                            }
                        }
                        changeRating(p[1], Math.min(12, firstBounce + 1));
                        addBattle(p[1], bid, Math.min(12, firstBounce + 1));
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
    let SQL = 'SELECT * FROM `user` ORDER BY `rating` DESC, `exp` DESC LIMIT 10';
    connection.query(SQL, [], (err, dat) => { rating = dat; });
    return rating;
}

function getUserBattle(uid, page, callback) {
    let SQL = "";
    if (uid != 1)
        SQL = 'SELECT * FROM `battle` WHERE player=? ORDER BY id DESC LIMIT ?, 20';
    else SQL = 'SELECT * FROM `battle` WHERE (1 OR player=?) ORDER BY id DESC LIMIT ?, 100';
    let SQLDATA = [uid, (--page) * 10];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) callback(err);
        else callback(null, dat);
    })
}

function getReplay(rid, callback) {
    let SQL = 'SELECT * FROM `battle_data` WHERE battle_id=?;';
    let SQLDATA = [rid];
    connection.query(SQL, SQLDATA, (err, dat) => {
        if (err) callback(err);
        else callback(null, dat);
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
    gameRatingCalc, getRatingList, getUserBattle, getReplay
}