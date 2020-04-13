var mysql = require('mysql');
var fs = require('fs');

const connection = eval(fs.readFileSync('db_data.js').toString());

/**
 * @function login
 * @param username {string} username
 * @param password {string} encrypted password
 * @param callback {function} callback
 */
function login(username, password, callback) {
    connection.connect();
    var SQL = 'SELECT * FROM `user` WHERE BINARY username=? AND BINARY password=?';
    var SQLDATA = [username, password];
    connection.query(SQL, SQLDATA, function (error, results) {
        if (error) callback(error);
        if (results == 0) callback(null, [false, -1, '错误的用户名或密码', { username: "ERRUSER", id: -1 }]);
        else callback(null, [true, 0, '成功登录', { username: results[0].username, id: results[0].id }])
    });
    connection.end();
}

/**
 * @function register
 * @param username {string}
 * @param password {string}
 */
function register(username, password, callback) {
    connection.connect();
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
        SQL = "INSERT INTO user (`username`, `password`) VALUES (?, ?)";
        SQLDATA = [username, password];
        connection.query(SQL, SQLDATA, function(error, results){
            if (error) callback(error);
            callback(null, [true, 0, {  }]);
        });
        connection.end();
    },function(reason){
        callback(reason);
        connection.end();
    });
    
}

login('1','1',function(err,dat){
    console.log(dat);
})

module.exports = {
    login,
    register
}