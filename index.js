/*!
 * index.js for Checkmate V2
 * @author By_Ha
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var size = 20;
var getMap = require('./getMap')
var db = require('./db')
var public = require('./app')

public.run();
app.get('/', function (req, res) { res.send('<h1>WS Server</h1>'); });

function run() {
    var User = new Map(), userSocket = new Map();
    var player = [], gm = [], color2Id = [0];
    var isGameStart = false;
    var gameInterval;
    var round = 0;

    // basic functions

    /**
     * boardcast something
     * @function bc
     * @param {string} name - name of the event
     * @param {any} [obj=null] - sending content
     * @param {string} [room='Game'] - roomname
     */
    function bc(name, obj = null, room = 'Game') {
        io.sockets.in(room).emit(name, obj);
    }

    /**
     * userSocket.emit
     * @function ue
     * @param {string} id - client.id
     * @param {string} name - name of the event
     * @param {any} [dat=null] - content
     */
    function ue(id, name, dat = null) {
        if (typeof (id) == "string") {
            var s = userSocket[id];
            if (s != undefined) s.emit(name, dat);
            else console.log("error on ue(), id is not exist.");
        } else {
            console.log("error on ue(), type error.");
        }
    }

    /**
     * @function preparedPlayerCount
     * @returns {object[]} [player count, vote yes player count]
     * @bc Logged user count {object[]} [player count, vote yes player count]
     */
    function preparedPlayerCount() {
        var cntPlayer = voteYesPlayer = 0;
        for (let key in User) {
            cntPlayer++;
            voteYesPlayer += Number(User[key]['voteStart']);
        }
        bc('LoggedUserCount', [cntPlayer, voteYesPlayer]);
        return [cntPlayer, voteYesPlayer];
    }

    // functions prepared for nextRound

    /**
     * clear some vars and prepare
     * @function gameInit
     */
    function gameInit() {
        // remeber GM isnt cleared here
        round = 0;
        isGameStart = false;
        player = [];
        color2Id = [0];
    }

    /**
     * add 1 for every crown
     * @function addAmountCrown
     */
    function addAmountCrown() {
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (gm[i][j].type == 1)
                    gm[i][j].amount++;
            }
        }
    }

    /**
     * add 1 for every city
     * @function addAmountCity
     */
    function addAmountCity() {
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (gm[i][j].type == 3)
                    gm[i][j].amount++;
            }
        }
    }

    /**
     * add 1 for every road
     * @function addAmountRoad
     */
    function addAmountRoad() {
        // console.log(size);
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (gm[i][j].type == 2 && gm[i][j].color && gm[i][j].amount > 0)
                    gm[i][j].amount++;
            }
        }
    }

    /**
     * default things to do when player win
     * @function playerWinAnction
     * @bc Win anction {string} winner's nick
     * @call when player.length <= 1 or other win anction
     */
    function playerWinAnction() {
        if (player.length == 1)
            bc('WinAnction', User[player[0]].nick);
        clearInterval(gameInterval);
        gameInit();
    }

    /**
     * @function combineBlock
     * @param {object[]} f - from block [x,y]
     * @param {object[]} t - to block [x,y]
     * @param {number} cnt - combine amount
     */
    function combineBlock(f, t, cnt, k) {
        if (t.color == f.color) { //same color means combine
            t.amount += cnt;
            f.amount -= cnt;
        } else { // not same color need to do delete
            t.amount -= cnt;
            f.amount -= cnt;
            if (t.amount < 0) { // t was cleared
                if (t.type == 1) { // t was player's crown and the player was killed
                    ue(color2Id[t.color], 'die');
                    var tcolor = t.color;
                    for (var i = 1; i <= size; ++i) {
                        for (var j = 1; j <= size; ++j) {
                            if (gm[i][j].color == tcolor) {
                                gm[i][j].color = f.color;
                                if (gm[i][j].type == 1) {
                                    gm[i][j].type = 3; // to a city
                                }
                            }
                        }
                    }
                } else if (t.type == 5) { // trans to city 
                    t.type = 3;
                } else if (t.type != 3) { // trans to road
                    t.type = 2;
                }
                t.color = f.color;
                t.amount = -t.amount;
            }
        }
    }

    /**
     * update the map and clear client's useless movement
     * @function updateMap
     * @bc Update round {number} round count
     * @bc Update GM {object[]} game map
     */
    function updateMap() {
        var needDeleteMovement = []; // players that finish movement below
        for (var i = 0; i < player.length; ++i) {
            var k = player[i];
            if (!User[k]) { // maybe disconnected
                // deletePlayer(k);
                continue;
            }
            var mv = User[k].movement;
            // console.log(mv);
            if (mv == 0 || mv == undefined) continue; // the movement is empty
            // console.log(mv);
            needDeleteMovement.push(k);
            var f = gm[mv[0]][mv[1]], t = gm[mv[2]][mv[3]];// from and to
            var cnt = ((mv[4] == 1) ? (Math.ceil((f.amount + 0.5) / 2)) : f.amount);// the amount that need to move
            cnt -= 1; // cannot move all
            if (f.color != User[k].color || cnt <= 0 || t.tpye == 4) { // wrong movement
                ue(k, 'ClearMovement');
                continue;
            }
            combineBlock(f, t, cnt);
        }
        bc('UpdateRound', round);
        bc('UpdateGM', gm)
        for (var i = 0; i < needDeleteMovement.length; ++i)
            ue(needDeleteMovement[i], 'DeleteMovement');
    }

    /**
     * codemeanings 0=>air 1=>home 2=>road 3=>city 4=>hill 5=>empty city
     * @function nextRound
     */
    function nextRound() {
        // console.log(round);

        // will enable coustomize
        round++;

        // custom anctions
        // TODO : add custom anctions
        // default anctions

        if (player.length <= 1) playerWinAnction();

        if ((round % size) == 0) addAmountRoad();

        addAmountCity(), addAmountCrown();
        updateMap();
    }

    // function prepared for generateGame

    /**
     * generate the game
     * @function generateGame
     * @bc Update size {number} size - the GM size
     * @bc Logged user count {object[]} [count player, 0]
     * @bc Update User {object[]} User - User list 
     * @bc Update GM {object[]} game map
     */
    function generateGame() {
        if (isGameStart) return;
        isGameStart = true;
        gm = [];
        // TODO player choose the size
        if (Object.keys(User).length <= 3) size = 10;
        else if (Object.keys(User).length <= 8) size = 20;
        else size = 30;
        bc('UpdateSize', size);
        gm = getMap.randomGetFile(size, Object.keys(User).length);
        var i = 1;
        bc('LoggedUserCount', [player.length, 0]);
        for (var key in User) {
            User[key]['voteStart'] = 0;
            player.push(key);
            color2Id[i] = key;
            User[key]['color'] = i;
            ++i;
        }
        bc('UpdateUser', User);
        bc('UpdateGM', gm)
        bc('GameStart');
        gameInterval = setInterval(() => {
            nextRound();
        }, 250);
    }

    // function prepared for socket

    io.on('connection', function (s) {
        // connection events
        // console.log(s.id + ":  Connected,ip:" + s.handshake.address.substr(7));
        s.join('Game');
        s.emit('isGameStart', isGameStart);
        preparedPlayerCount();

        //basic events
        /**
         * @function Ask-size
         * @returns size {number} gamemap size
         */
        s.on('AskSize', function (dat) {
            s.emit('UpdateSize', size);
        })

        /**
         * @function Third-person-mode
         * @returns Third-Person-Mode-Status
         */
        s.on('ThirdPersonMode', function (dat) {
            delete User[s.id];
            delete userSocket[s.id];
            if (player.indexOf(s.id) != -1)
                player.splice(player.indexOf(s.id), 1);
            // console.log(s.id, "Entered Third Person Mode,ip:" + s.handshake.address.substr(7));
            s.emit('ThirdPersonModeStatus', true);
            if (isGameStart) return;
            var t = preparedPlayerCount();
            if (t[0] >= 2 && t[1] > (t[0] / 2))
                generateGame();
        })

        /**
         * @function makeSwal
         * @param title {string}
         * @param type {number}
         * @param timer {number}
         */
        function makeSwal(title, type=0, timer=3000){
            var ty = ['success', 'error', 'warning', 'info'];
            return {
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: timer,
                type: ty[type],
                title: title
            };
        }

        /**
         * @function Login
         */
        s.on('Login', function (nick) {
            User[s.id] = { 'nick': nick, 'voteStart': 0 };
            userSocket[s.id] = s;
            preparedPlayerCount();
        })
        
        /**
         * @function LoginV2
         */
        s.on('LoginV2', function(username, password){
            password = String(password);
            username = String(username);
            db.login(username, password, function(err,dat){
                if(err) console.log(err);
                console.log(dat);
                if(dat[0]) s.emit('swal', makeSwal("登录成功", 0, 3000), `logged();`);
                else s.emit('swal', makeSwal("登录失败", 1, 3000), `setTimeout(()=>{$("#login-button").click()},1000)`);
            })
        })

        /**
         * @function AutoLoginV2
         */
        s.on('AutoLoginV2', function(username, password){
            password = String(password);
            username = String(username);
            db.login(username, password, function(err,dat){
                if(err) console.log(err);
                console.log(dat);
                if(dat[0]) s.emit('swal', makeSwal("自动登录成功", 0, 3000), `logged();`);
                else s.emit('swal', makeSwal("自动登录失败", 1, 3000), `setTimeout(()=>{$("#login-button").click()},1000)`);
            })
        })

        /**
         * @function RegisterV2
         */
        s.on('RegisterV2', function(username, password){
            password = String(password);
            username = String(username);
            if(password.length<=2 || password.length>=30) s.emit('swal', makeSwal("注册失败,密码长度不正确.", 1, 3000), `setTimeout(()=>{register();},1000)`);
            if(username.length<=2 || username.length>=30) s.emit('swal', makeSwal("注册失败,用户名长度不正确.", 1, 3000), `setTimeout(()=>{register();},1000)`);
            db.register(username, password, function(err, dat){
                if(err) console.log(err);
                if(dat[0]) s.emit('swal', makeSwal("注册成功", 0, 3000), `setTimeout(()=>{window.location.reload();},1000)`);
                else if(dat[1] == -1) s.emit('swal', makeSwal("注册失败,用户名已被使用", 1, 3000), `setTimeout(()=>{register();},1000)`);
                else s.emit('swal', makeSwal("注册失败", 1, 3000), `setTimeout(()=>{register();},1000)`);
            })
        })

        /**
         * @function Change-Nick
         * @param nick {string} nickname
         */
        s.on('ChangeNick', function (nick) {
            if (User[s.id] != undefined)
                User[s.id]['nick'] = nick;
        })

        /**
         * @function disconnect
         */
        s.on('disconnect', function(dat){
            // console.log(s.id + ":Disconnected,ip:" + s.handshake.address.substr(7));
            delete User[s.id];
            delete userSocket[s.id];
            if (player.indexOf(s.id) != -1)
                player.splice(player.indexOf(s.id), 1);
            if (isGameStart) return;
            var t = preparedPlayerCount;
            if (t[0] >= 2 && t[1] > (t[0] / 2))
                generateGame();
        })

        /**
         * @function Vote-Start
         */
        s.on('VoteStart', function (dat) {
            // console.log("____________________VS");
            if (isGameStart) return;
            User[s.id]['voteStart'] = dat;
            t = preparedPlayerCount();
            // console.log(t);
            if (t[0] >= 2 && t[1] > (t[0] / 2))
                generateGame();
        })

        // Data upload events

        /**
         * @function Upload-Movement
         */
        s.on('UploadMovement', function (dat) {
            if(User == undefined || User[s.id] == undefined) return;
            User[s.id]['movement'] = dat;
            s.emit('ReceiveMovement', dat);
        })

        // Admin events
        /**
         * @function ft force third
         */
        s.on('ft', function () {
            bc('ForceThird');
        })

        /**
         * @function Force-stop
         */
        s.on('ForceStop', function () {
            clearInterval(gameInterval);
            isGameStart = false;
            player = [];
        })

        /**
         * @function fs force start
         */
        s.on('fs', function () {
            generateGame();
        })

        /**
         * @function uploadMap
         * @param dat {object[]} [name, size, mapdata]
         */
        s.on('uploadMap', function(dat){
            fs.writeFile("public/maps/" + String(dat[1]) + "/" +  dat[0] + '.txt', dat[2], function(err){ if(err) console.log(err);});
        })
    })
    http.listen(3001, function () {
        console.log('listening on *:3001');
    });
}

run();