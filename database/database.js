var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var MarkdownIt = require('markdown-it'),
    md = new MarkdownIt({breaks: true});

var connection;
var sessionStore;

function handleError () {
    connection = eval(fs.readFileSync('database/database_data.js').toString());
    // connection = eval(fs.readFileSync('./database_data.js').toString());

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
    connection.connect(function (err) {
        if (err) {
            console.log('error when connecting to db:', err);
            setTimeout(handleError , 2000);
        }
    });
 
    connection.on('error', function (err) {
        console.log('db error', err);
        // 如果是连接断开，自动重新连接
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
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
    for(var i = 1;i<=10;++i)
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
    if(username.indexOf('<') != -1 || username.length < 3){
        callback(null, [-2, '用户名不能小于3位且不能包含"<"号']);
        return ;
    } else if(password.length < 8){
        callback(null, [-2, '密码不能小于八位']);
        return ;
    }
    for(var i = 1;i<=10;++i)
        password = crypto.createHash('md5').update("114514" + password + 'encryptionKana').digest("hex")
    username = String(username), password = String(password);
    var SQL = 'SELECT * FROM `user` WHERE BINARY username=?';
    var SQLDATA = [username];
    var p = new Promise(function (resolve, reject) {
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) reject(-1);
            if(results == 0) resolve(0);
            else resolve(-1);
        });
    });
    p.then(function(data){
        if(data == -1)  {
            callback(null, [-1, "该用户名已被注册"]);
            return ;
        }
        SQL = "INSERT INTO user (`username`, `password`) VALUES (?, ?)";
        SQLDATA = [username, password];
        connection.query(SQL, SQLDATA, function(error, results){
            if (error) callback(error);
            getUserId(username, function(err, dat){
                if(err) callback(err);
                callback(null, [0, "注册成功", dat]);
            })
            // callback(null, [0, "注册成功"]);
        });
    },function(reason){
        callback(reason);
    });
}

function modifyExp(uid, amount, callback) {
    var SQL = 'UPDATE `user` SET exp=exp+? WHERE id=?';
    var SQLDATA = [amount, uid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
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
        if (error) {callback(error);return;}
        callback(null, [0, results]);
    });
}

function addSubmission(uid, dat, callback) {
    var SQL = 'INSERT INTO `submission`(`data`, `uid`) VALUES (?,?)';
    var SQLDATA = [uid, dat];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        callback(null, [0]);
    });
}

function queryTypeContent(type, page, pagesize, callback){
    var SQL = `select * from content where type=? AND hidden=0 order by user_id=1 desc,id desc limit ?,?;`
    var SQLDATA = [type, (page-1)*pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        results.forEach(e => {
            e.content = md.render(e.content);
        })
        callback(null, results);
    });
}

function getPost(pid, callback){
    var SQL = `select * from content where id=? AND hidden=0;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) callback(error, results);
        callback(null, results);
    });
}

function updatePost(pid, username, content, callback){
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if(username != results[0].user_name && username != "admin") {
            callback("Permission Denied", null);
            return;
        }
        var SQL = `UPDATE content SET content=? WHERE id=?;`
        var SQLDATA = [content, pid];
        connection.query(SQL, SQLDATA, function (error, results) {
            if(error) {
                callback(error, null);
                return ;
            }
            callback(null, "成功修改");
        });
    });
}

function deletePost(pid, username, callback){
    var SQL = `select * from content where id=?;`
    var SQLDATA = [pid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if(username != results[0].user_name && username != "admin") {
            callback("Permission Denied", null);
            return;
        }
        var SQL = `UPDATE content SET hidden=? WHERE id=?;`
        var SQLDATA = [true, pid];
        connection.query(SQL, SQLDATA, function (error, results) {
            if(error) {
                callback(error, null);
                return ;
            }
            callback(null, "成功删除");
        });
    });
}

function queryUserContent(uid, page, pagesize, callback){
    var SQL = `select * from content where user_id=? AND hidden=0 order by id desc limit ?,?;`
    var SQLDATA = [uid, (page-1)*pagesize, pagesize];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        results.forEach(e => {
            e.content = md.render(e.content);
        })
        callback(null, results);
    });
}

function getUserId(username, callback){
    var SQL = 'SELECT * FROM `user` WHERE username=?';
    var SQLDATA = [username];
    
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        if(results[0] != undefined)
            callback(null, results[0].id);
        else callback("No Such User", null);
    });
}

function getUsername(userid, callback){
    var SQL = 'SELECT * FROM `user` WHERE id=?';
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        if(results[0] != undefined)
            callback(null, results[0].username);
        else callback("No Such User", null);
    });
}

function getUserInfo(userid, callback){
    var SQL = `SELECT id,username, exp FROM user WHERE id=?`;
    var SQLDATA = [userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) throw error;
        if(results[0] != undefined)
            callback(null, results[0]);
        else callback("No Such User", null);
    });
}

function getUserExperienceById(userid, callback){
    getUserInfo(userid, function(err, dat){
        if(err) callback(err, null);
        else callback(null, dat.exp);
    })
}

function getUserExperienceByUsername(username, callback){
    getUserId(username, function(err, userid){
        getUserInfo(userid, function(err, dat){
            if(err) callback(err, null);
            else callback(null, dat.exp);
        })
    })
}

function getUserLevelById(userid, callback){
    getUserExperienceById(userid, function(err, dat){
        if(err) callback(err);
        else callback(null, ((dat>=28800)?6:((dat>=10800)?5:((dat>=4500)?4:((dat>=1500)?3:((dat>=200?2:((dat>=100)?1:0))))))));
    });
}

function getUserLevelByUsername(username, callback){
    getUserId(username, (err, dat) => {
        if(err) callback(err);
        else {
            getUserExperienceById(dat, function(err, dat){
                if(err) callback(err);
                else callback(null, ((dat>=28800)?6:((dat>=10800)?5:((dat>=4500)?4:((dat>=1500)?3:((dat>=200?2:((dat>=100)?1:0))))))));
            });
        }
    })
}

function addUserExperienceById(userid, exp, callback = ()=>{}){
    var SQL = 'UPDATE `user` SET `exp`= `exp` + ? WHERE id=?';
    var SQLDATA = [exp, userid];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) {callback(error);return;}
        callback(null, 'success');
    });
}

function post(username, type, content, callback){
    if(username == undefined || username.length <= 2) return;
    var SQL = `INSERT INTO content(type, user_id, user_name, content, hidden)
    VALUES (?, ?, ?, ?, 0)`;
    getUserId(username, (err, dat)=>{
        if(err) {callback(error);return;}
        var SQLDATA = [type, dat, username, content];
        connection.query(SQL, SQLDATA, function (error, results) {
            if (error) {callback(error);return;}
            callback(null, [0]);
        });
        addUserExperienceById(dat, 10);
    })
}

module.exports = {
    login,
    register,
    modifyExp,
    querySubmission,
    addSubmission,
    sessionStore,
    queryTypeContent,
    getUsername,
    post,
    getUserId,
    getUserInfo,
    queryUserContent,
    getPost,
    updatePost,
    deletePost,
    getUserLevelById,
    getUserLevelByUsername,
    getUserExperienceById,
    getUserExperienceByUsername
}