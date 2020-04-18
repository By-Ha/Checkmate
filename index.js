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
var pub = require('./app')
var bot = require('./bot')
var events = require('events')

pub.run();
app.get('/', function (req, res) { res.send('<h1>WS Server</h1>'); });

function run() {
    var User = new Map(), userSocket = new Map();
    var player = [], gm = [], color2Id = [0];
    var isGameStart = false;
    var gameInterval;
    var round = 0;
    var evalcmd;
    var botEmitter;

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
        if(botEmitter!=undefined && botEmitter[0] != undefined){
            botEmitter[0].emit(name, obj);
        }
    }

    /**
     * userSocket.emit
     * @function ue
     * @param {string} id - client.id
     * @param {string} name - name of the event
     * @param {any} [dat=null] - content
     */
    function ue(id, name, dat = null) {
        if(id == 'bot' && botEmitter!=undefined && botEmitter[0] != undefined){
            botEmitter[0].emit(name, dat);
            return;
        }
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
            if (!User[key].prepareGame) continue;
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
                if (gm[i][j].type == 1){
                    gm[i][j].amount++;
                    if(color2Id[gm[i][j].color] == 'bot'){
                        gm[i][j].amount++;
                    }
                }
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
     * @function endRound
     */
    function endRound() {
        for (var key in User) {
            User[key].gaming = false;
            if (User[key].connect == false) delete User[key];
        }
    }

    /**
     * default things to do when player win
     * @function playerWinAnction
     * @bc Win anction {string} winner's nick
     * @call when player.length <= 1 or other win anction
     */
    function playerWinAnction() {
        for(var i = 0;i<player.length;++i){
            if (User[player[i]].gaming == true)
                bc('WinAnction', User[player[i]].nick);
        }
        clearInterval(gameInterval);
        gameInit();
        endRound();
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
                    User[color2Id[t.color]].gaming = false;
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
        // console.log(User);
        var needDeleteMovement = []; // players that finish movement below
        for (var i = 0; i < player.length; ++i) {
            var k = player[i];
            if (!User[k] || !User[k].gaming) { // maybe disconnected
                continue;
            }
            var mv = User[k].movement;
            if (mv == 0 || mv == undefined) continue; // the movement is empty
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

    function alivePlayer(){
        var t = 0;
        for(var i = 0;i<player.length;++i){
            if(User[player[i]] == undefined) continue;
            if(User[player[i]].gaming == true) ++t;
        }
        return t;
    }

    /**
     * codemeanings 0=>air 1=>home 2=>road 3=>city 4=>hill 5=>empty city
     * @function nextRound
     */
    function nextRound() {
        // console.log(round);

        round++;

        if (alivePlayer() <= 1) playerWinAnction();

        if (evalcmd == "") {
            if ((round % size) == 0) addAmountRoad();
            addAmountCity(), addAmountCrown();
        } else {
            eval(evalcmd);
        }

        updateMap();
    }

    /**
         * @function makeSwal
         * @param title {string}
         * @param type {number}
         * @param timer {number}
         */
    function makeSwal(title, type = 0, timer = 3000) {
        var ty = ['success', 'error', 'warning', 'info', ''];
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
        gm = []; evalcmd = "";
        var i = 1;
        for (var key in User) {
            User[key]['voteStart'] = 0;
            if (!User[key].prepareGame) continue;
            User[key].gaming = true;
            player.push(key);
            color2Id[i] = key;
            User[key]['color'] = i;
            ++i;
        }
        User['bot'] = {};
        User['bot'].gaming = true;
        User['bot'].id=0;
        User['bot'].nick='伞兵1号带<span style="color: red;font-size: 150%;">Bot</span>';
        User['bot'].color=i;
        botEmitter=[];
        botEmitter[0] = new events.EventEmitter;
        player.push('bot');
        color2Id[i] = 'bot';
        bot.bot(botEmitter[0], i);
        botEmitter[0].on('AskSize', ()=>{botEmitter[0].emit('UpdateSize', size)});
        botEmitter[0].on('UploadMovement', (dat)=>{
            User['bot'].movement = dat;
        });


        gm = getMap.randomGetFileV2(player.length);
        evalcmd = gm[0][0].cmd;
        size = gm[0][0].size;

        bc('UpdateSize', size);
        bc('swal', makeSwal("地图名称:" + gm[0][0].mapName + "\n作者:" + gm[0][0].author, 3, 5000));
        bc('LoggedUserCount', [0, 0]); // just clear it
        bc('execute', "$('#ready')[0].innerHTML = '准备'");

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
        s.join('Game');
        s.emit('isGameStart', isGameStart);
        preparedPlayerCount();

        /**
         * try to freeze sb
         * @function freezeUser
         * @param {String} key 
         * @param {Boolean} conn 
         */
        function freezeUser(key, conn = true) {
            if (User[key] == undefined) return;
            User[key].prepareGame = false;
            User[key].gaming = false;
            User[key].voteStart = false;
            User[key].connect = conn;
        }

        function unFreezeUser(key) {
            User[key].prepareGame = true;
        }

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
            // delete User[s.id];
            freezeUser(s.id, true);
            delete userSocket[s.id];// this should to be noticed later,Tag: TODO 
            if (player.indexOf(s.id) != -1)
                player.splice(player.indexOf(s.id), 1);
            s.emit('ThirdPersonModeStatus', true);
            if (isGameStart) return;
            var t = preparedPlayerCount();
            if (t[0] >= 2 && t[1] > (t[0] / 2))
                generateGame();
        })

        // /**
        //  * @function Login
        //  * @achieved
        //  */
        // s.on('Login', function (nick) {
        //     User[s.id] = { 'nick': nick, 'voteStart': 0 };
        //     userSocket[s.id] = s;
        //     preparedPlayerCount();
        // })

        /**
         * @function addUser
         */
        function addUser(username, id) {
            bc('swal', makeSwal(username + "已连接", 3, 3000));
            User[s.id] = { 'nick': username, 'voteStart': 0, 'id': id, 'prepareGame': true, 'gaming': false, 'connect': true };
            userSocket[s.id] = s;
            preparedPlayerCount();
        }

        /**
         * @function LoginV2
         */
        s.on('LoginV2', function (username, password) {
            password = String(password);
            username = String(username);
            db.login(username, password, function (err, dat) {
                if (err) console.log(err);
                console.log(dat);
                if (dat[0]) {
                    s.emit('swal', makeSwal("登录成功", 0, 3000), `logged();`);
                    addUser(dat[3].username, dat[3].id);
                }
                else s.emit('swal', makeSwal("登录失败", 1, 3000), `setTimeout(()=>{$("#login-button").click()},1000)`);
            })
        })

        /**
         * @function AutoLoginV2
         */
        s.on('AutoLoginV2', function (username, password) {
            password = String(password);
            username = String(username);
            db.login(username, password, function (err, dat) {
                if (err) console.log(err);
                console.log(dat);
                if (dat[0]) {
                    s.emit('swal', makeSwal("自动登录成功", 0, 3000), `logged();`);
                    addUser(dat[3].username, dat[3].id);
                }
                else s.emit('swal', makeSwal("自动登录失败", 1, 3000), `setTimeout(()=>{$("#login-button").click()},1000)`);
            })
        })

        /**
         * @function RegisterV2
         */
        s.on('RegisterV2', function (username, password) {
            password = String(password);
            username = String(username);
            if (username.indexOf("<")!=-1) {
                s.emit('swal', makeSwal("不允许使用<", 1, 3000), `setTimeout(()=>{register();},1000)`);
                return;
            }
            if (username.length <= 2 || username.length >= 30) {
                s.emit('swal', makeSwal("注册失败,用户名长度不正确.", 1, 3000), `setTimeout(()=>{register();},1000)`);
                return;
            }
            db.register(username, password, function (err, dat) {
                if (err) console.log(err);
                if (dat[0]) s.emit('swal', makeSwal("注册成功", 0, 3000), `setTimeout(()=>{window.location.reload();},1000)`);
                else if (dat[1] == -1) s.emit('swal', makeSwal("注册失败,用户名已被使用", 1, 3000), `setTimeout(()=>{register();},1000)`);
                else s.emit('swal', makeSwal("注册失败", 1, 3000), `setTimeout(()=>{register();},1000)`);
            })
        })

        /**
         * @function disconnect
         */
        s.on('disconnect', function (dat) {
            if (User[s.id] == undefined) return;
            bc('swal', makeSwal(User[s.id].nick + "断开连接", 3, 3000));
            freezeUser(s.id, false);
            delete userSocket[s.id];
            if (player.indexOf(s.id) != -1)
                player.splice(player.indexOf(s.id), 1);
            if (isGameStart) return;
            var t = preparedPlayerCount();
            if (t[0] >= 2 && t[1] > (t[0] / 2))
                generateGame();
        })

        /**
         * @function Vote-Start
         */
        s.on('VoteStart', function (dat) {
            if (User[s.id] == undefined) return;
            if (User[s.id].prepareGame == false) s.emit('swal', { title: "刷新!" }, `window.location.reload();`)
            if (isGameStart) return;
            User[s.id]['voteStart'] = dat;
            t = preparedPlayerCount();
            if (t[0] >= 1 && t[1] > (t[0] / 2))
                generateGame();
        })

        // Data upload events

        /**
         * @function Upload-Movement
         */
        s.on('UploadMovement', function (dat) {
            if (User == undefined || User[s.id] == undefined || !User[s.id].gaming) return;
            User[s.id]['movement'] = dat;
            s.emit('ReceiveMovement', dat);
        })

        s.on('getUser', () => {
            s.emit('UpdateUser', User);
        })

        /**
         * 聊天内容
         * @function SendWorldMessage
         */
        s.on('SendWorldMessage', (dat) => {
            if (User[s.id] == undefined) {
                s.emit('swal', makeSwal('请登录', 1, 3000));
                return;
            }
            if (dat.toLowerCase().indexOf("script") != -1 && User[s.id].id != 1) {
                s.emit('swal', makeSwal('你想干啥?', 1, 3000));
                return;
            }
            s.emit('WorldMessage', dat);
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
         * @function cmd
         */
        s.on('cmd', function (dat) {
            if (User[s.id] == undefined) return;
            if (User[s.id].id != 1) return;
            eval(dat);
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
        s.on('uploadMap', function (dat) {
            fs.writeFile("public/maps/" + String(dat[1]) + "/" + dat[0] + '.txt', dat[2], function (err) { if (err) console.log(err); });
        })
    })
    http.listen(3001, function () {
        console.log('listening on *:3001');
    });
}

run();