var db = require('../database/database');
var xss = require("xss");
var Rooms = new Map();

function Run(io) {
    class Room {
        constructor() {
            this.gm;
            this.lastGM;
            this.color2Id = [];
            this.gameInterval;
            this.round = 0;
            this.evalcmd;
            this.size;
            this.gamelog = [];
        }
    }

    var connectedUsers = new Map();
    var playerRoom = {};

    function bc(room, name, dat = null) {
        io.sockets.in(room).emit(name, dat);
    }

    function ue(id, name, dat = null) {
        if (connectedUsers[id] != undefined && connectedUsers[id].socket != undefined) {
            if (io.sockets.connected[connectedUsers[id].socket]) {
                io.sockets.connected[connectedUsers[id].socket].emit(name, dat);
            }
        }
    }

    function makeSwal(title, type, timer = 3000, toast = true) {
        return {
            toast: toast,
            position: (toast ? 'top' : 'center'),
            showConfirmButton: false,
            timer: timer,
            type: type,
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
                    let place = 0;
                    for (let temp in Rooms[room].playedPlayer) if (Rooms[room].playedPlayer[temp].place == 0) place++;
                    Rooms[room].playedPlayer[color2Id[t.color]].place = place;
                    if (color2Id[t.color] && User[color2Id[t.color]])
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

    function generatePatch(last, now) {
        let ret = [];
        for (let i in now) {
            for (let j in now[i]) {
                if (last[i] == undefined || last[i][j] == undefined || JSON.stringify(last[i][j]) != JSON.stringify(now[i][j])) {
                    ret.push([i, j, JSON.stringify(now[i][j])]);
                }
            }
        }
        return ret;
    }

    function Rank(room) {
        let gm = Rooms[room].game.gm;
        let size = Rooms[room].game.size;
        let playerInfo = [];
        if (gm == 0) return;
        for (let i = 1; i <= size; ++i) {
            for (let j = 1; j <= size; ++j) {
                if (gm[i][j].color != 0) {
                    if (playerInfo[gm[i][j].color] == undefined) playerInfo[gm[i][j].color] = [0, 0, 0];
                    playerInfo[gm[i][j].color][0] += 1;
                    playerInfo[gm[i][j].color][1] += gm[i][j].amount;
                    playerInfo[gm[i][j].color][2] = gm[i][j].color;
                }
            }
        }
        playerInfo.sort(function (a, b) {
            if (a == undefined) return (b == undefined) ? 0 : -1;
            if (b == undefined) return 1;
            if (a[1] == b[1]) return b[0] - a[0];
            return b[1] - a[1];
        });
        return playerInfo;
    }

    function updateMap(room) {
        let player = Rooms[room].player;
        let gm = Rooms[room].game.gm;
        let size = Rooms[room].game.size;
        var needDeleteMovement = []; // players that finish movement below
        Rooms[room].game.gamelog[Rooms[room].game.round] = {};
        Rooms[room].game.lastGM = JSON.parse(JSON.stringify(gm));
        for (let k in player) {//var i = 0; i < player.length; ++i
            if (!player[k].gaming) { // maybe disconnected
                continue;
            }
            var mv = player[k].movement;
            Rooms[room].game.gamelog[Rooms[room].game.round][k] = mv.concat();
            if (mv == 0 || mv == undefined) continue; // the movement is empty
            needDeleteMovement.push(k);
            if (mv[0] > size || mv[1] > size || mv[2] > size || mv[3] > size
                || mv[0] < 1 || mv[1] < 1 || mv[2] < 1 || mv[3] < 1) {
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
        bc(room, 'Map_Update', [Rooms[room].game.round, generatePatch(Rooms[room].game.lastGM, Rooms[room].game.gm)]);
        bc(room, 'Rank_Update', Rank(room));
        for (var i = 0; i < needDeleteMovement.length; ++i)
            ue(needDeleteMovement[i], 'DeleteMovement');
    }

    function playerWinAnction(room) {
        try {
            Rooms[room].game.gamelog[0][0][0].version = 1;
            for (let k in Rooms[room].playedPlayer) {
                if (Rooms[room].player[k] != undefined && Rooms[room].player[k].gaming == true) {
                    Rooms[room].playedPlayer[k].place = 1;
                } else if (Rooms[room].playedPlayer[k].place == 0) {
                    Rooms[room].playedPlayer[k].place = 2;
                }
            }
            db.gameRatingCalc(Rooms[room].playedPlayer, JSON.stringify(Rooms[room].game.gamelog));
            for (let k in Rooms[room].player) {
                if (Rooms[room].player[k].connect == false) {
                    delete Rooms[room].player[k];
                    continue;
                }
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
            if (Object.keys(Rooms[room].player).length == 0) {
                delete Rooms[room];
            }
        }
        catch (e) {
            console.log('WinAnction', e, Rooms[room]);
        }
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

        if ((round % size) == 0) addAmountRoad();
        addAmountCity(), addAmountCrown();

        updateMap(room);
    }

    function generateMap(player) {
        function rnd(num) {
            var t = Math.round(Math.random() * num);
            return (t == 0) ? num : t
        }
        function Astar(gm, x, y, tar_x, tar_y) {
            let vis = [];
            let q = [];
            let d = [[1, -1, 0, 0], [0, 0, 1, -1]];
            for (let i = 1; i <= size; ++i) vis[i] = [];
            q.push([x, y, 0]);
            vis[x][y] = 1;
            while (q.length > 0) {
                let tx = q[0][0], ty = q[0][1], step = q[0][2];
                q = q.slice(1);
                for (let j = 0; j < 4; ++j) {
                    let tx2 = tx + d[0][j], ty2 = ty + d[1][j];
                    if (tx2 > size || ty2 > size || tx2 <= 0 || ty2 <= 0 || gm[tx2][ty2].type == 4 || vis[tx2][ty2]) continue;
                    vis[tx2][ty2] = 1;
                    q.push([tx2, ty2, step + 1]);
                    if (tx2 == tar_x && ty2 == tar_y)
                        return step + 1;
                }
            }
            return -1;
        }
        let gm = [];
        let size = 0;
        if (player == 2) size = 10;
        else size = 20;
        for (let i = 0; i <= size; ++i) {
            gm[i] = [];
            for (let j = 0; j <= size; ++j) {
                gm[i][j] = { "color": 0, "type": 0, "amount": 0 }; // 空白图
            }
        }
        gm[0][0] = { size: size };
        for (var i = 1; i <= 0.2 * size * size; ++i) {
            var t1 = rnd(size),
                t2 = rnd(size);
            while (gm[t1][t2].type != 0) {
                t1 = rnd(size), t2 = rnd(size)
            }
            gm[t1][t2].type = 4
        }
        for (var i = 1; i <= 0.1 * size * size; ++i) {
            var t1 = rnd(size),
                t2 = rnd(size);
            while (gm[t1][t2].type != 0) {
                t1 = rnd(size), t2 = rnd(size)
            }
            gm[t1][t2].type = 5;
            gm[t1][t2].amount = Number(rnd(10)) + 40;
        }
        let last = [];
        let calcTimes = 0;
        for (var i = 1; i <= player; ++i) {
            ++calcTimes;
            if (calcTimes >= 100) return generateMap(player);
            var t1 = rnd(size - 2) + 1,
                t2 = rnd(size - 2) + 1;
            // 至少留一个方位有空
            while (gm[t1][t2].type != 0 || (gm[t1 + 1][t2].type != 0 && gm[t1 - 1][t2].type != 0 && gm[t1][t2 + 1].type != 0 && gm[t1][t2 + 1].type != 0)) {//  
                t1 = rnd(size - 2) + 1, t2 = rnd(size - 2) + 1;
            }

            if (i == 1) {
                gm[t1][t2].color = i;
                gm[t1][t2].amount = 1;
                gm[t1][t2].type = 1;
            } else {
                let flag = 0;
                for (let j = 0; j < last.length; ++j) {
                    if (Astar(gm, t1, t2, last[j][0], last[j][1]) >= 6) {
                        continue;
                    }
                    flag = 1;
                    --i;
                    break;
                }
                if (flag == 0) {
                    gm[t1][t2].color = i;
                    gm[t1][t2].amount = 1;
                    gm[t1][t2].type = 1;
                }
            }
            last.push([t1, t2]);
        }
        return gm;
    }

    function startGame(room) {
        if (Rooms[room].start) return;
        Rooms[room].game = new Room();
        Rooms[room].start = true;
        Rooms[room].playedPlayer = {};
        let i = 1;
        for (var k in Rooms[room].player) {
            if (i > 8) break;
            Rooms[room].playedPlayer[k] = {};
            Rooms[room].playedPlayer[k].place = 0;
            Rooms[room].player[k].prepare = false;
            Rooms[room].player[k].gaming = true;
            Rooms[room].game.color2Id[i] = k;
            Rooms[room].player[k].color = i;
            ue(k, 'UpdateColor', i);
            ++i;
        }
        Rooms[room].game.gm = generateMap(--i);
        Rooms[room].game.gamelog[0] = JSON.parse(JSON.stringify(Rooms[room].game.gm));
        Rooms[room].game.gamelog[0][0][0].player = JSON.parse(JSON.stringify(Rooms[room].player));
        Rooms[room].game.evalcmd = Rooms[room].game.gm[0][0].cmd;
        Rooms[room].game.gm[0][0].cmd = "";
        Rooms[room].game.size = Rooms[room].game.gm[0][0].size;
        bc(room, 'UpdateSize', Rooms[room].game.size);
        bc(room, 'LoggedUserCount', [0, 0]); // just clear it
        bc(room, 'execute', "$('#ready')[0].innerHTML = '准备'");

        bc(room, 'UpdateUser', Rooms[room].player);
        bc(room, 'GameStart');
        bc(room, 'UpdateGM', Rooms[room].game.gm);
        Rooms[room].interval = setInterval(() => {
            nextRound(room);
        }, 1000 / Rooms[room].settings.speed);
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
        let uid, uname;
        db.sessionStore.get(s.handshake.signedCookies.client_session, (err, dat) => {
            uid = dat.uid;
            uname = dat.username;

            if (connectedUsers[uid] != undefined) {
                s.emit('execute', `Swal.fire("加入房间失败:已有加入的房间", '', "error")`);
                s.disconnect();// 断开一个用户的多个连接
            }
            connectedUsers[uid] = { socket: s.id };

            // 退出
            s.on('disconnect', function () {
                delete connectedUsers[uid];
                if (Rooms[playerRoom[uid]] == undefined) return;
                if (Rooms[playerRoom[uid]].player[uid].gaming) {
                    let place = 0;
                    for (let temp in Rooms[playerRoom[uid]].playedPlayer)
                        if (Rooms[playerRoom[uid]].playedPlayer[temp].place == 0) place++;
                    Rooms[playerRoom[uid]].playedPlayer[uid].place = place;
                    Rooms[playerRoom[uid]].player[uid].gaming = false;
                    Rooms[playerRoom[uid]].player[uid].connect = false;
                } else {
                    delete Rooms[playerRoom[uid]].player[uid];
                    for (let k in Rooms[playerRoom[uid]].player) {
                        if (Rooms[playerRoom[uid]].player[k].connect == false) delete Rooms[playerRoom[uid]].player[k];
                    }
                }
                if (Object.keys(Rooms[playerRoom[uid]].player).length == 0 && Rooms[playerRoom[uid]].game == undefined) {
                    delete Rooms[playerRoom[uid]];
                }
                if (Rooms[playerRoom[uid]] != undefined) {
                    t = preparedPlayerCount(playerRoom[uid]);
                    bc(playerRoom[uid], 'LoggedUserCount', t);
                }
                delete playerRoom[uid];
            });

            // 世界房间,用于聊天
            s.join('World');

            // 加入房间
            s.on('joinRoom', function (room) {
                if (connectedUsers[uid] == undefined) {
                    s.emit('swal', makeSwal('加入房间失败 原因未知', 'error', 3000, false))
                    return;
                }
                room = String(room);
                if (room == 'World') {
                    s.emit('swal', makeSwal('本房间不能被加入', 'error', 3000, false))
                    return;
                }
                s.join(room);
                if (Rooms[room] == undefined) {
                    Rooms[room] = {
                        game: undefined, start: false, player: {}, playedPlayer: {},
                        interval: undefined,
                        settings: { speed: 4, private: false }
                    };
                }
                Rooms[room].player[uid] = { uname: uname, prepare: false, gaming: false, connect: true, color: 0, movement: [] };
                playerRoom[uid] = room;
                t = preparedPlayerCount(playerRoom[uid]);
                bc(playerRoom[uid], 'LoggedUserCount', t);
                s.emit('UpdateSettings', Rooms[room].settings);
            });



            // 投票开始/结束
            s.on('VoteStart', function (dat) {
                try {
                    if (connectedUsers[uid] == undefined || Rooms[playerRoom[uid]] == undefined) return;
                    if (Rooms[playerRoom[uid]].start) return;
                    Rooms[playerRoom[uid]].player[uid].prepare = dat ? true : false;
                    t = preparedPlayerCount(playerRoom[uid]);
                    bc(playerRoom[uid], 'LoggedUserCount', t);
                    if (t[0] >= 2 && t[1] > (t[0] / 2))
                        startGame(playerRoom[uid]);
                } catch (err) {
                    console.log("CORE ERROR", "VOTESTART", err);
                }
            })

            s.on('changeSettings', function (dat) {
                if (dat.speed) {
                    let speed = Number(dat.speed);
                    if (speed == 1 || speed == 2 || speed == 3 || speed == 4) {
                        Rooms[playerRoom[uid]].settings.speed = dat.speed;
                    }
                }
                if (dat.private != undefined) {
                    if (Rooms[playerRoom[uid]] != undefined)
                        Rooms[playerRoom[uid]].settings.private = dat.private;
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
                dat = xss(dat);
                bc('World', 'WorldMessage', uname + ': ' + dat);
            })

            s.on('eval', function (dat) {
                if (uid == 1) eval(dat);
            })
        })
    })
}

module.exports = {
    Run,
    Rooms
}