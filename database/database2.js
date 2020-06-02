var crypto = require('crypto');
var Sequelize = require('sequelize');

var sequelize = require('./sequelize');

var User = require('./models/user');
var Content = require('./models/content');
var Battle = require('./models/battle');
var Battle_data = require('./models/battle_data');
var Comment = require('./models/comment');

// (async () => {
//     var p = await Battle.findAll({
//         where: {
//             battle_id: 'BO5ajvRYo4BKFirtTC3yEGR8seQUCJ4NN6GrE7ByzAsOQwQlEL3Wn2cjOOT30Wiw'
//         }
//     });
//     console.log(p);
// })();

// USER

function login(username, password, callback) {
    password = String(password);
    username = String(username);
    for (var i = 1; i <= 10; ++i)
        password = crypto.createHash('md5').update("114514" + password + 'encryptionKana').digest("hex");
    (async () => {
        try {
            var r = await User.findAll({
                where: {
                    username: username,
                    password: password
                }
            })
            console.log(r);
            if (r.length == 0) {
                callback(null, [-1, '错误的用户名或密码', { username: "ERRUSER", id: -1 }]);
                return;
            }
            else {
                callback(null, [0, '成功登录', { username: r[0].username, id: r[0].id }]);
                return;
            }
        } catch (e) {
            callback(e);
        }
    })();
}

function register(username, password, callback) {
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

    (async () => {
        let r = User.findAll({
            where: {
                username: username
            }
        })
        if (r.length != 0) { callback(null, [-1, "该用户名已被注册"]); return; }
        else {
            let r = User.create({
                username: username,
                password: password
            })
        }
    })();

    var SQL = 'SELECT * FROM `user` WHERE username=?';
    var SQLDATA = [username];

    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) { callback('error'); return; }
        if (results == 0) {
            SQL = "INSERT INTO user (`username`, `password`, `exp`, `rating`) VALUES (?, ?, 0, 0)";
            SQLDATA = [username, password];
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

function getUserInfo(userid, callback) {
    (async () => {
        let r = User.findAll({
            where: {
                id: userid
            }
        });
        if (r.length == 0) { callback('No Such User'); return; }
        // else 
    })();
}

// Content

// Comment

// Battle & Battle_data

