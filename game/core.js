var getMap = require('../game/getMap');
var db = require('../database/database');

function Run(io) {
    class Room {
        constructor() {
            this.gm;
            this.color2Id = [];
            this.gameInterval;
            this.round = 0;
            this.evalcmd;
            this.size;
        }
    }

    var Rooms = new Map();
    var connectedUsers = new Map();
    var playerRoom = {};

    function bc(room, name, dat = null) {
        // console.log(room, name, dat==null);
        io.sockets.in(room).emit(name, dat);
        // io.sockets.in("TEST").emit(1, [2]);
    }

    function ue(id, name, dat = null) {
        if (connectedUsers[id].socket != undefined) {
            if (io.sockets.connected[connectedUsers[id].socket]) {
                io.sockets.connected[connectedUsers[id].socket].emit(name, dat);
            }
        }
    }

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

    function combineBlock(room, f, t, cnt) {
        let gm = Rooms[room].game.gm;
        let User = Rooms[room].player;
        let color2Id = Rooms[room].game.color2Id;
        let size = Rooms[room].game.size;
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

    function updateMap(room) {
        let player = Rooms[room].player;
        let gm = Rooms[room].game.gm;
        let size = Rooms[room].game.size;
        var needDeleteMovement = []; // players that finish movement below
        for (let k in player) {//var i = 0; i < player.length; ++i
            if (!player[k].gaming) { // maybe disconnected
                continue;
            }
            var mv = player[k].movement;
            if (mv == 0 || mv == undefined) continue; // the movement is empty
            needDeleteMovement.push(k);
            if (mv[0]>size || mv[1]>size || mv[2]>size || mv[3]>size
                || mv[0]<1 || mv[1]<1 || mv[2]<1 || mv[3]<1){
                player[k].movement = [];
                continue;
            }
            var f = gm[mv[0]][mv[1]], t = gm[mv[2]][mv[3]];// from and to
            var cnt = ((mv[4] == 1) ? (Math.ceil((f.amount + 0.5) / 2)) : f.amount);// the amount that need to move
            cnt -= 1; // cannot move all
            if (f.color != player[k].color || cnt <= 0 || t.tpye == 4) { // wrong movement
                ue(k, 'ClearMovement');
                continue;
            }
            combineBlock(room, f, t, cnt);
            player[k].movement = [];
        }
        bc(room, 'UpdateRound', Rooms[room].game.round);
        bc(room, 'UpdateGM', Rooms[room].game.gm)
        for (var i = 0; i < needDeleteMovement.length; ++i)
            ue(needDeleteMovement[i], 'DeleteMovement');
    }

    function playerWinAnction(room) {
        for (let k in Rooms[room].player) {
            if (Rooms[room].player[k].gaming == true) {
                bc(room, 'WinAnction', Rooms[room].player[k].uname);
                db.addUserExperienceById(k, 20);
            }
            Rooms[room].player[k].gaming = false;
            Rooms[room].player[k].prepare = false;
        }
        clearInterval(Rooms[room].interval);
        delete Rooms[room].game;
        Rooms[room].start = false;
    }

    function alivePlayer(room) {
        let t = 0;
        for (let k in Rooms[room].player) {
            if (!Rooms[room].player[k].gaming) continue;
            t++;
        }
        return t;
    }

    function nextRound(room) {
        let game = Rooms[room].game;
        let round = ++game.round;
        let gm = game.gm;
        let size = game.size;

        function addAmountCrown() {
            for (var i = 1; i <= size; ++i) {
                for (var j = 1; j <= size; ++j) {
                    if (gm[i][j].type == 1) {
                        gm[i][j].amount++;
                    }
                }
            }
        }
        function addAmountCity() {
            for (var i = 1; i <= size; ++i) {
                for (var j = 1; j <= size; ++j) {
                    if (gm[i][j].type == 3)
                        gm[i][j].amount++;
                }
            }
        }
        function addAmountRoad() {
            for (var i = 1; i <= size; ++i) {
                for (var j = 1; j <= size; ++j) {
                    if (gm[i][j].type == 2 && gm[i][j].color && gm[i][j].amount > 0)
                        gm[i][j].amount++;
                }
            }
        }

        if (alivePlayer(room) <= 1) {
            playerWinAnction(room);
            return;
        }

        if (game.evalcmd == "") {
            if ((round % size) == 0) addAmountRoad();
            addAmountCity(), addAmountCrown();
        } else {
            eval(game.evalcmd);
        }

        updateMap(room);
    }

    function startGame(room) {
        if (Rooms[room].start) return;
        Rooms[room].game = new Room();
        Rooms[room].start = true;
        let i = 1;
        for (var k in Rooms[room].player) {
            Rooms[room].player[k].prepare = false;
            Rooms[room].player[k].gaming = true;
            Rooms[room].game.color2Id[i] = k;
            Rooms[room].player[k].color = i;
            ue(k, 'UpdateColor', i);
            ++i;
        }
        Rooms[room].game.gm = getMap.randomGetFileV2(--i);
        Rooms[room].game.evalcmd = Rooms[room].game.gm[0][0].cmd;
        Rooms[room].game.gm[0][0].cmd = "";
        Rooms[room].game.size = Rooms[room].game.gm[0][0].size;
        bc(room, 'UpdateSize', Rooms[room].game.size);
        bc(room, 'swal', makeSwal("地图名称:" + Rooms[room].game.gm[0][0].mapName + "\n作者:" + Rooms[room].game.gm[0][0].author, 3, 5000));
        bc(room, 'LoggedUserCount', [0, 0]); // just clear it
        bc(room, 'execute', "$('#ready')[0].innerHTML = '准备'");

        bc(room, 'UpdateUser', Rooms[room].player);
        bc(room, 'UpdateGM', Rooms[room].game.gm)
        bc(room, 'GameStart');
        Rooms[room].interval = setInterval(() => {
            nextRound(room);
        }, 1000/Rooms[room].settings.speed);
    }

    function preparedPlayerCount(room) {
        var pre = 0, all = 0;
        for (let k in Rooms[room].player) {
            if (Rooms[room].player[k].prepare) {
                pre++;
            }
            all++;
        }
        return [all, pre];
    }

    io.on('connection', function (s) {
        let uid = s.handshake.session.uid;
        let uname = s.handshake.session.username;
        if (connectedUsers[uid] != undefined) s.disconnect();// 断开一个用户的多个连接
        connectedUsers[uid] = { socket: s.id };

        // 世界房间,用于聊天
        s.join('World');

        // 加入房间
        s.on('joinRoom', function (room) {
            room = String(room);
            if (room == 'World') return;
            s.join(room);
            if (Rooms[room] == undefined) {
                Rooms[room] = {
                    game: undefined, start: false, player: {}, interval: undefined,
                    settings: {speed: 2}
                };
            }
            Rooms[room].player[uid] = { uname: uname, prepare: false, gaming: false, color: 0, movement: [] };
            playerRoom[uid] = room;
            t = preparedPlayerCount(playerRoom[uid]);
            bc(playerRoom[uid], 'LoggedUserCount', t);
            s.emit('UpdateSettings', Rooms[room].settings);
        });

        // 退出
        s.on('disconnect', function () {
            delete connectedUsers[uid];
            if(Rooms[playerRoom[uid]] == undefined) return ;
            delete Rooms[playerRoom[uid]].player[uid];
            if(Object.keys(Rooms[playerRoom[uid]].player).length == 0){
                delete Rooms[playerRoom[uid]];
            }
            if(Rooms[playerRoom[uid]] != undefined){
                t = preparedPlayerCount(playerRoom[uid]);
                bc(playerRoom[uid], 'LoggedUserCount', t);
            }
            delete playerRoom[uid];
        });

        // 投票开始/结束
        s.on('VoteStart', function (dat) {
            console.log(1);
            try{
                if (connectedUsers[uid] == undefined || Rooms[playerRoom[uid]] == undefined) return;
                if (Rooms[playerRoom[uid]].start) return;
                Rooms[playerRoom[uid]].player[uid].prepare = dat ? true : false;
                t = preparedPlayerCount(playerRoom[uid]);
                bc(playerRoom[uid], 'LoggedUserCount', t);
                if (t[0] >= 2 && t[1] > (t[0] / 2))
                    startGame(playerRoom[uid]);
            }catch(err){
                console("CORE ERROR", "VOTESTART");
            }
        })

        s.on('changeSettings', function(dat){
            if(dat.speed){
                let speed = Number(dat.speed);
                if(speed == 1 || speed == 2 || speed == 3 || speed == 4) {
                    Rooms[playerRoom[uid]].settings.speed = dat.speed;
                }
            }
            bc(playerRoom[uid], 'UpdateSettings', Rooms[playerRoom[uid]].settings);
        })

        s.on('AskSize', function () {
            if (Rooms[playerRoom[uid]].game != undefined)
                ue(uid, 'UpdateSize', Rooms[playerRoom[uid]].game.size);
            ue(uid, 'UpdateUser', Rooms[playerRoom[uid]].player);
        })

        s.on('UploadMovement', function (dat) {
            if (connectedUsers[uid] == undefined || playerRoom[uid] == undefined) return;
            if (!Rooms[playerRoom[uid]].start || !Rooms[playerRoom[uid]].player[uid].gaming) return;
            Rooms[playerRoom[uid]].player[uid].movement = dat;
            s.emit('ReceiveMovement', dat);
        })

        s.on('SendWorldMessage', function (dat) {
            if (dat == "") {
                return;
            }
            if ((dat.toLowerCase().indexOf("script") != -1 || dat.toLowerCase().indexOf("on") != -1) && uid != 1) {
                s.emit('swal', makeSwal('你想干啥?', 1, 3000));
                return;
            }
            bc('World', 'WorldMessage', uname + ': ' + dat);
        })
    })
}

module.exports = {
    Run
}