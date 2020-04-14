var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');

const connection = eval(fs.readFileSync('db_data.js').toString());

/**
 * @function login
 * @param username {string} username
 * @param password {string} encrypted password
 * @param callback {function} callback
 */
connection.connect();
function login(username, password, callback) {
    password = String(password);
    username = String(username);
    for(var i = 1;i<=10;++i)
        password = crypto.createHash('md5').update("sdjajhdjka" + password + 'encryptionCheckmate').digest("hex");
    var SQL = 'SELECT * FROM `user` WHERE BINARY username=? AND BINARY password=?';
    var SQLDATA = [username, password];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) callback(error);
        if (results == 0) callback(null, [false, -1, '错误的用户名或密码', { username: "ERRUSER", id: -1 }]);
        else callback(null, [true, 0, '成功登录', { username: results[0].username, id: results[0].id }])
    });
}

/**
 * @function register
 * @param username {string}
 * @param password {string}
 */
function register(username, password, callback) {
    password = String(password);
    username = String(username);
    for(var i = 1;i<=10;++i)
        password = crypto.createHash('md5').update("sdjajhdjka" + password + 'encryptionCheckmate').digest("hex")
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
        if(data == -1)  callback(null, [false, -1, {  }]);
        SQL = "INSERT INTO user (`username`, `password`) VALUES (?, ?)";
        SQLDATA = [username, password];
        connection.query(SQL, SQLDATA, function(error, results){
            if (error) callback(error);
            callback(null, [true, 0, {  }]);
        });
    },function(reason){
        callback(reason);
    });
    
}

module.exports = {
    login,
    register
}