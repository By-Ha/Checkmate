var db = require('../database/database');
var xss = require("xss");
var mp = require('./map');
var Rooms = new Map();

function Run(io) {
    class Room {
        constructor() {
            this.gm;
            this.lastGM;
            this.color2Id = [];
            this.gameInterval;
            this.round = 0;
            this.size;
            this.gamelog = [];
            this.colorVars = [];
        }
    }

    var connectedUsers = new Map();
    var playerRoom = {};

    function bc(room, name, dat = null) {
        io.sockets.in(room).emit(name, dat);
    }

    function ue(id, name, dat = null) {
        if (!isNaN(Number(id))) {
            if (connectedUsers[id] != undefined && connectedUsers[id].socket != undefined) {
                if (io.sockets.connected[connectedUsers[id].socket]) {
                    io.sockets.connected[connectedUsers[id].socket].emit(name, dat);
                }
            }
        } else {
            try {
                io.sockets.connected[id].emit(name, dat);
            } catch (e) {
                console.log(io, id);//.socket.connected
            }
        }

    }

    function getUserMap(gm, color){
        let ret = [];
        let size = gm[0][0].size;
        function judgeShown(i,j){
            let visiRound = 1;
            for (let t1 = -visiRound; t1 <= visiRound; ++t1) {
                for (let t2 = -visiRound; t2 <= visiRound; ++t2) {
                    let ii = i + t1, jj = j + t2;
                    if (ii <= 0 || jj <= 0 || ii > size || jj > size) continue;
                    if (gm[ii][jj].color == color) return true;
                }
            }
            return false;
        }
        ret[0] = [];
        ret[0][0] = gm[0][0];
        for(let i = 1;i <= size; ++i){
            ret[i] = [];
            for(let j = 1;j <= size; ++j){
                ret[i][j] = {color: 0, type: 0, amount: 0};
                if(gm[i][j].type == 4 || gm[i][j].type == 3 || gm[i][j].type == 5 || judgeShown(i, j)){
                    ret[i][j] = gm[i][j];
                }
            }
        }
        return JSON.parse(JSON.stringify(ret));
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

    function combineBlock(room, f, t, cnt, other) {
        console.log(f,t,cnt);
        let game = Rooms[room].game;
        let gm = Rooms[room].game.gm;
        let User = Rooms[room].player;
        let color2Id = Rooms[room].game.color2Id;
        let size = Rooms[room].game.size;
        if (gm[0][0].type == 1 || gm[0][0].type == 3) {
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
        } else if (gm[0][0].type == 2) {
            // 然后进行其他的处理
            if (t.type == 1) {
                let tc = t.color, fc = f.color;
                let fAttack = game.colorVars[fc].sword + 10, tAttack = game.colorVars[tc].sword + 10;
                let fArmor = game.colorVars[fc].armor, tArmor = game.colorVars[tc].armor;
                // 不能出现攻击倒贴血的情况.
                if (t.amount * (Math.max(tAttack - fArmor, 0)) > f.amount * (Math.max(fAttack - tArmor, 0))) {
                    // 'from'玩家 死了
                    game.colorVars[tc].sword += game.colorVars[fc].sword;
                    game.colorVars[tc].heart += game.colorVars[fc].heart;
                    game.colorVars[tc].armor += game.colorVars[fc].armor;
                    ue(color2Id[f.color], 'die');
                    ue(color2Id[t.color], 'select_home');
                    let place = 0;
                    for (let temp in Rooms[room].playedPlayer) if (Rooms[room].playedPlayer[temp].place == 0) place++;
                    Rooms[room].playedPlayer[color2Id[f.color]].place = place;
                    if (color2Id[f.color] && User[color2Id[f.color]])
                        User[color2Id[f.color]].gaming = false;
                    t.amount = Math.round(t.amount - f.amount * (Math.max(fAttack - tArmor, 0)) / Math.max(tAttack - fArmor, 1));
                    f.amount = 0;
                    f.color = 0;
                    f.type = 0;
                } else if (t.amount * (Math.max(tAttack - fArmor, 0)) < f.amount * (Math.max(fAttack - tArmor, 0))) {
                    // 'to'玩家 死了
                    game.colorVars[fc].sword += game.colorVars[tc].sword;
                    game.colorVars[fc].heart += game.colorVars[tc].heart;
                    game.colorVars[fc].armor += game.colorVars[tc].armor;
                    ue(color2Id[t.color], 'die');
                    ue(color2Id[f.color], 'select_home');
                    let place = 0;
                    for (let temp in Rooms[room].playedPlayer) if (Rooms[room].playedPlayer[temp].place == 0) place++;
                    Rooms[room].playedPlayer[color2Id[t.color]].place = place;
                    if (color2Id[t.color] && User[color2Id[t.color]])
                        User[color2Id[t.color]].gaming = false;
                    f.amount = Math.round(f.amount - t.amount * (Math.max(tAttack - fArmor, 0)) / Math.max(fAttack - tArmor, 1));
                    t.amount = 0;
                    t.color = 0;
                    t.type = 0;
                } else {
                    ue(color2Id[f.color], 'select_home');
                    t.amount = 1;
                    f.amount = 1;
                }
            }
            else if (t.type == 7) {
                t.amount = f.amount;
                t.color = f.color;
                t.type = 1;
                f.amount = 0;
                f.color = 0;
                f.type = 0;
                Rooms[room].game.colorVars[t.color].heart += 1;
            }
            else if (t.type == 8) {
                t.amount = f.amount;
                t.color = f.color;
                t.type = 1;
                f.amount = 0;
                f.color = 0;
                f.type = 0;
                Rooms[room].game.colorVars[t.color].sword += 2;
            } else if (t.type == 10) {
                t.amount = f.amount;
                t.color = f.color;
                t.type = 1;
                f.amount = 0;
                f.color = 0;
                f.type = 0;
                t.amount += 100;
                t.amount = Math.min(t.amount, 100 + Rooms[room].game.colorVars[t.color].heart * 20);
            } else if (t.type == 11) {
                t.amount = f.amount;
                t.color = f.color;
                t.type = 1;
                f.amount = 0;
                f.color = 0;
                f.type = 0;
                Rooms[room].game.colorVars[t.color].armor += 1;
            } else {
                t.amount = f.amount;
                t.color = f.color;
                t.type = 1;
                f.amount = 0;
                f.color = 0;
                f.type = 0;
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
        let game = Rooms[room].game;
        let size = Rooms[room].game.size;
        Rooms[room].game.gamelog[Rooms[room].game.round] = {};
        if (Rooms[room].game.type == 2) {
            function addPlayerHealth() {
                for (var i = 1; i <= size; ++i) {
                    for (var j = 1; j <= size; ++j) {
                        // 每个星星给玩家提供20血量
                        if (gm[i][j].type == 1 && gm[i][j].amount < 100 + game.colorVars[gm[i][j].color].heart * 20) {
                            gm[i][j].amount++;
                        }
                    }
                }
            }
            addPlayerHealth();
        }
        for (let k in player) {//var i = 0; i < player.length; ++i
            if (!player[k].connect || player[k].view) { // maybe disconnected
                if (!player[k].gaming) continue;
                for (let i = 1; i <= size; ++i) {
                    for (let j = 1; j <= size; ++j) {
                        if (gm[i][j].color == player[k].color) {
                            gm[i][j].color = 0;
                            if (gm[i][j].type == 1) {
                                gm[i][j].type = 5;
                            } else if (gm[i][j].type == 3) {
                                gm[i][j].type = 5;
                            }
                        }
                    }
                }
                continue;
            }
            var mv = player[k].movement[0];
            if (mv == undefined) mv = [];
            Rooms[room].game.gamelog[Rooms[room].game.round][k] = mv.concat();
            if (mv == 0 || mv == undefined) continue; // the movement is empty
            if (mv[0] > size || mv[1] > size || mv[2] > size || mv[3] > size
                || mv[0] < 1 || mv[1] < 1 || mv[2] < 1 || mv[3] < 1 || (Math.abs(mv[0] - mv[2]) + Math.abs(mv[1] - mv[3])) > 1) {
                player[k].movement = [];
                continue;
            }
            // 以上过滤用户输入
            if (Rooms[room].game.type == 1 || Rooms[room].game.type == 3) {
                var f = gm[mv[0]][mv[1]], t = gm[mv[2]][mv[3]];// from and to
                var cnt = ((mv[4] == 1) ? (Math.ceil((f.amount + 0.5) / 2)) : f.amount);// the amount that need to move
                cnt -= 1; // cannot move all
                if (f.color != player[k].color || cnt <= 0 || t.type == 4) { // wrong movement
                    while (player[k].movement.length != 0) {
                        let x1 = player[k].movement[0][0], x2 = player[k].movement[0][1];
                        let y1 = player[k].movement[0][2], y2 = player[k].movement[0][3];
                        if (gm[x1][x2].color != player[k].color || gm[x1][x2].type == 4 || gm[y1][y2].type == 4 || gm[x1][x2].amount <= 1) player[k].movement.shift();
                        else break;
                    }
                    continue;
                }
                combineBlock(room, f, t, cnt, { fx: mv[0], fy: mv[1] });
            } else if (Rooms[room].game.type == 2) {
                var f = gm[mv[0]][mv[1]], t = gm[mv[2]][mv[3]];
                if (f.color != player[k].color || cnt <= 0 || t.type == 4) { // wrong movement
                    while (player[k].movement.length != 0) {
                        let x1 = player[k].movement[0][0], x2 = player[k].movement[0][1];
                        if (gm[x1][x2].color != player[k].color || gm[x1][x2].amount <= 1) player[k].movement.shift();
                        else break;
                    }
                    if (player[k].movement.length == 0) // 轨迹偏移自动选家
                        ue(game.color2Id[player[k].color], 'select_home');
                    continue;
                }
                combineBlock(room, f, t, 0);
                if (Math.min(game.size - mv[0] + 1, mv[0], game.size - mv[1] + 1, mv[1]) <= game.colorVars[0].gasLevel && f.type != 1) {
                    f.type = 9;
                }
            }
            player[k].movement.shift();
        }
        if (Rooms[room].game.type == 2) {
            let color2Id = Rooms[room].game.color2Id;
            let User = Rooms[room].player;
            function rnd(num) {
                var t = Math.round(Math.random() * num);
                return (t == 0) ? num : t
            }

            for (let i = 1; i <= game.size; ++i) {
                for (let j = 1; j <= game.size; ++j) {
                    if (Math.min(game.size - i + 1, i, game.size - j + 1, j) <= game.colorVars[0].gasLevel && gm[i][j].type == 1) {
                        gm[i][j].amount -= game.colorVars[0].gasLevel * 10;
                        if (gm[i][j].amount <= 0) {
                            gm[i][j].amount = 0;
                            gm[i][j].type = 9;

                            ue(color2Id[gm[i][j].color], 'die');
                            let place = 0;
                            for (let temp in Rooms[room].playedPlayer) if (Rooms[room].playedPlayer[temp].place == 0) place++;
                            Rooms[room].playedPlayer[color2Id[gm[i][j].color]].place = place;
                            if (color2Id[gm[i][j].color] && User[color2Id[gm[i][j].color]])
                                User[color2Id[gm[i][j].color]].gaming = false;
                            gm[i][j].color = 0;
                        }
                    }
                }
            }

            // 毒圈
            game.colorVars[0].gasTime--;

            if (game.colorVars[0].gasTime <= 0) {
                game.colorVars[0].gasTime = (Math.ceil(game.size / 2) - game.colorVars[0].gasLevel) * 5;
                game.colorVars[0].gasLevel++;
                for (let i = 1; i <= game.size; ++i) {
                    for (let j = 1; j <= game.size; ++j) {
                        if (Math.min(game.size - i + 1, i, game.size - j + 1, j) <= game.colorVars[0].gasLevel && gm[i][j].type != 1) {
                            gm[i][j].type = 9;
                        }
                    }
                }
            }

            if (Rooms[room].game.round % 20 == 1) {// 生成奖励物品
                for (let i = 1; i <= 3 * alivePlayer(room); ++i) {
                    for (let tryTime = 1; tryTime <= 10; ++tryTime) {// 重复十次尝试生成
                        let tx = rnd(Rooms[room].game.size), ty = rnd(Rooms[room].game.size);
                        if (gm[tx][ty].type == 0) {
                            let t = rnd(700);
                            if (t <= 200) {
                                gm[tx][ty].type = 7;
                            } else if (t <= 400) {
                                gm[tx][ty].type = 8;
                            } else if (t <= 500) {
                                gm[tx][ty].type = 10;
                            } else if (t <= 700) {
                                gm[tx][ty].type = 11;
                            }
                            break;
                        }
                    }
                }
            }
        }
        if(Rooms[room].game.type != 3)
            bc(room, 'Map_Update', [Rooms[room].game.round, generatePatch(Rooms[room].game.lastGM, Rooms[room].game.gm)]);
        else {
            // 防止客户端查看全部地图
            for(let k in Rooms[room].playedPlayer){
                if(Rooms[room].player[k] == undefined || Rooms[room].player[k].gaming == false){ continue; }
                Rooms[room].playedPlayer[k].prevGM = Rooms[room].playedPlayer[k].gm;
                Rooms[room].playedPlayer[k].gm = getUserMap(Rooms[room].game.gm, Rooms[room].player[k].color);
                let sender = generatePatch(Rooms[room].playedPlayer[k].prevGM, Rooms[room].playedPlayer[k].gm);
                ue(k, 'Map_Update', [Rooms[room].game.round, sender]);
            }
        }
        bc(room, 'Rank_Update', Rank(room));
        bc(room, 'Game_Status', true);
        if (game.type == 2) bc(room, 'colorVars_Update', game.colorVars);
    }

    function playerWinAnction(room) {
        try {
            bc(room, 'Game_Status', false);
            let firstFlag = 0;
            Rooms[room].game.gamelog[0][0][0].version = (Rooms[room].game.type == 1 ? 1 : 2);
            for (let k in Rooms[room].playedPlayer) {
                if (Rooms[room].player[k] != undefined && Rooms[room].player[k].gaming == true && Rooms[room].playedPlayer[k].place == 0 && !firstFlag) {
                    Rooms[room].playedPlayer[k].place = 1;
                    firstFlag = 1;
                } else if (Rooms[room].playedPlayer[k].place == 0) {
                    Rooms[room].playedPlayer[k].place = 2;
                }
            }
            // 由于排名有点小问题且不会引起rating改变,在这做一下处理,而且如果最后俩人死了,给uid最靠前的人一个奖励算了(才不是懒得写)
            let cnt = firstFlag ? 2 : 1;
            for (let k in Rooms[room].playedPlayer) {
                if (Rooms[room].playedPlayer[k].place == 1) {
                    continue;
                } else {
                    Rooms[room].playedPlayer[k].place = cnt++;
                }
            }
            db.gameRatingCalc(room, Rooms[room].playedPlayer, JSON.stringify(Rooms[room].game.gamelog), Rooms[room].game.type == 3 ? true : false);
            let winner = [];
            for(let k in Rooms[room].playedPlayer){
                if (Rooms[room].playedPlayer[k].place == 1) {
                    winner.push(Rooms[room].player[k].uname);
                    db.addUserExperienceById(k, 20);
                }
            }
            bc(room, 'WinAnction', winner.join(','));
            for (let k in Rooms[room].player) {
                if (Rooms[room].player[k].connect == false) {
                    delete Rooms[room].player[k];
                    continue;
                }
                Rooms[room].player[k].gaming = false;
                Rooms[room].player[k].prepare = false;
            }
            clearInterval(Rooms[room].interval);
            delete Rooms[room].game;
            Rooms[room].start = false;
            if (Object.keys(Rooms[room].player).length == 0) {
                delete Rooms[room];
            } else {
                t = preparedPlayerCount(room);
                bc(room, 'LoggedUserCount', t);
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
        Rooms[room].game.lastGM = JSON.parse(JSON.stringify(gm));

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

        if (gm[0][0].type == 1 || gm[0][0].type == 3) {
            if ((round % 10) == 0) addAmountRoad();
            addAmountCity(), addAmountCrown();
        }

        updateMap(room);
    }

    function getClientIp(s) {
        return s.handshake.headers["x-real-ip"];
    }

    function getVotedMap(room) {
        if (room == "随机房") {
            return [1, 1, 0, 0, 0, 0];
        } else if (room == "迷宫房") {
            return [2, 0, 1, 0, 0, 0];
        } else if (room == "空白房") {
            return [3, 0, 0, 1, 0, 0];
        } else if (room == "流浪房") {
            return [5, 0, 0, 0, 0, 1];
        }
        let votedMap = [null, 0, 0, 0, 0, 0, 0];
        for (var k in Rooms[room].player) {
            if(Rooms[room].player[k].view == true) continue;
            votedMap[Rooms[room].player[k].settings.map]++;
        }
        let max = 0, maxPlc = 1;
        for (let i = 1; i < votedMap.length; ++i) {
            if (votedMap[i] > max) maxPlc = i, max = votedMap[i];
        }
        votedMap[0] = maxPlc;
        return votedMap;
    }

    function startGame(room) {
        let ips = {};
        if (Rooms[room].start) return;
        Rooms[room].game = new Room();
        Rooms[room].start = true;
        Rooms[room].playedPlayer = {};

        let i = 1;
        for (let k in Rooms[room].player) {
            if (ips[Rooms[room].player[k].ip] != undefined) {
                ips[Rooms[room].player[k].ip].push(Rooms[room].player[k].uname);
            } else {
                ips[Rooms[room].player[k].ip] = [Rooms[room].player[k].uname];
            }
        }
        for (let k in ips) {
            if (ips[k].length > 1) {
                bc(room, 'WorldMessage', ips[k].join() + "使用相同ip游戏");
            }
        }
        for (var k in Rooms[room].player) {
            if (i > 8) break;
            if (Rooms[room].player[k].view == true) continue;
            Rooms[room].playedPlayer[k] = {};
            Rooms[room].playedPlayer[k].place = 0;
            Rooms[room].player[k].prepare = false;
            Rooms[room].player[k].gaming = true;
            Rooms[room].game.color2Id[i] = k;
            Rooms[room].player[k].color = i;
            Rooms[room].game.colorVars[i] = { heart: 0, sword: 0, armor: 0 };
            ue(k, 'UpdateColor', i);
            ++i;
        }

        Rooms[room].game.gm = mp.generateMap(getVotedMap(room)[0], --i);
        Rooms[room].game.gamelog[0] = JSON.parse(JSON.stringify(Rooms[room].game.gm));
        Rooms[room].game.gamelog[0][0][0].player = JSON.parse(JSON.stringify(Rooms[room].player));
        Rooms[room].game.gamelog[0][0][0].version = (Rooms[room].game.gm[0][0].type == 1 ? 1 : 2);

        Rooms[room].game.size = Rooms[room].game.gm[0][0].size;
        Rooms[room].game.type = Rooms[room].game.gm[0][0].type;

        if (Rooms[room].game.type == 2) {
            Rooms[room].game.colorVars[0] = {
                gasLevel: 0,
                gasTime: 50
            }
        }
        if(Rooms[room].game.type == 3) {
            // 防止客户端查看全部地图
            for(let k in Rooms[room].playedPlayer){
                if(Rooms[room].player[k] == undefined || Rooms[room].player[k].gaming == false){ continue; }
                Rooms[room].playedPlayer[k].gm = getUserMap(Rooms[room].game.gm, Rooms[room].player[k].color);
                ue(k, 'UpdateGM', Rooms[room].playedPlayer[k].gm);
            }
        } else{
            bc(room, 'UpdateGM', Rooms[room].game.gm);
        }

        bc(room, 'UpdateSize', Rooms[room].game.size);
        bc(room, 'LoggedUserCount', [0, 0]); // just clear it
        bc(room, 'execute', "$('#ready')[0].innerHTML = '准备'");
        bc(room, 'UpdateUser', Rooms[room].player);
        bc(room, 'GameStart');

        Rooms[room].interval = setInterval(() => {
            nextRound(room);
        }, 1000 / Rooms[room].settings.speed);
    }

    function preparedPlayerCount(room) {
        if (!Rooms[room] || !Rooms[room].player) return [0, 0];
        var pre = 0, all = 0;
        for (let k in Rooms[room].player) {
            if (Rooms[room].player[k].view) continue;
            if (Rooms[room].player[k].prepare) {
                pre++;
            }
            all++;
        }
        return [all, pre];
    }

    io.on('connection', function (s) {
        let uid, uname;
        if (!s.handshake.signedCookies.client_session) {
            s.emit('execute', `Swal.fire("看到此消息请尝试重新登录,如果无法解决请联系管理员", 'ERRCODE: PRE_SOCKET_LOGIN_UNEXPECTED_NULL', "error")`);
            s.disconnect();
            return;
        }
        db.sessionStore.get(s.handshake.signedCookies.client_session, (err, dat) => {
            if (!dat) {
                console.error('SOCKET_LOGIN_UNEXPECTED_NULL_OF_SESSION_DATA', s.handshake.signedCookies);
                s.emit('execute', `Swal.fire("看到此消息请联系管理员,也可以尝试重新登录",
                 'ERRCODE: SOCKET_LOGIN_UNEXPECTED_NULL_OF_SESSION_DATA:` + `', "error")`);
                s.disconnect();
                return;
            }
            uid = dat.uid;
            uname = dat.username;
            if (uid == null || uname == null) {
                s.emit('execute', `Swal.fire("看到此消息请联系管理员,也可以尝试重新登录", 'ERRCODE: SOCKET_LOGIN_UNEXPECTED_NULL` + dat + `', "error")`);
                s.disconnect();
            }
            uid = dat.uid;
            uname = dat.username;

            if (connectedUsers[uid] != undefined) {
                s.emit('execute', `Swal.fire("旧连接已经被删除!", '', "info")`);
                if (io.sockets.connected[connectedUsers[uid].socket]) {
                    io.sockets.connected[connectedUsers[uid].socket].emit('closeTab');
                    io.sockets.connected[connectedUsers[uid].socket].conn.close();
                }
            }
            connectedUsers[uid] = { socket: s.id };

            s.on('reconnect', function () {
                if (connectedUsers[uid] == s.id) {
                    console.log('grant reconnect');
                } else {
                    s.disconnect();
                    console.log('denied reconnect');
                }
            })

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
                if (Object.keys(Rooms[playerRoom[uid]].player).length == 0) {
                    delete Rooms[playerRoom[uid]];
                }
                if (Rooms[playerRoom[uid]] != undefined) {
                    t = preparedPlayerCount(playerRoom[uid]);
                    bc(playerRoom[uid], 'LoggedUserCount', t);
                }
                if (Rooms[playerRoom[uid]]) {
                    Rooms[playerRoom[uid]].settings.map = getVotedMap(playerRoom[uid]);
                    bc(playerRoom[uid], 'UpdateSettings', Rooms[playerRoom[uid]].settings);
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
                        settings: { speed: 4, private: false, map: [] }
                    };
                }
                Rooms[room].player[uid] = {
                    uname: uname, prepare: false, gaming: false, connect: true, view: false, color: 0, movement: [],
                    settings: {
                        map: 1
                    },
                    ip: getClientIp(s)
                };
                for (let k in Rooms[room].player) {
                    if (Rooms[room].player[uid].ip == Rooms[room].player[k].ip && k != uid) {
                        bc(room, 'WorldMessage', `${uname}和${Rooms[room].player[k].uname}使用相同ip进行游戏.`);
                    }
                }
                playerRoom[uid] = room;
                t = preparedPlayerCount(playerRoom[uid]);
                bc(playerRoom[uid], 'LoggedUserCount', t);
                if (Rooms[playerRoom[uid]]) {
                    Rooms[playerRoom[uid]].settings.map = getVotedMap(playerRoom[uid]);
                    bc(playerRoom[uid], 'UpdateSettings', Rooms[playerRoom[uid]].settings);
                }
            });

            s.on('view', (dat) => {
                if (playerRoom[uid] != undefined && Rooms[playerRoom[uid]] != undefined && Rooms[playerRoom[uid]].player[uid] != undefined) {
                    Rooms[playerRoom[uid]].player[uid].view = dat;
                    Rooms[playerRoom[uid]].player[uid].gaming = false;
                    Rooms[playerRoom[uid]].player[uid].prepare = false;
                    s.emit('view_status', Rooms[playerRoom[uid]].player[uid].view);
                }
                t = preparedPlayerCount(playerRoom[uid]);
                bc(playerRoom[uid], 'LoggedUserCount', t);
                if (Rooms[playerRoom[uid]]) {
                    Rooms[playerRoom[uid]].settings.map = getVotedMap(playerRoom[uid]);
                    bc(playerRoom[uid], 'UpdateSettings', Rooms[playerRoom[uid]].settings);
                }
                if (t[0] >= 2 && t[1] > (t[0] / 2))
                    startGame(playerRoom[uid]);
            })

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
                if (!Rooms[playerRoom[uid]]) return;
                if (dat) {
                    if (dat.speed) {
                        let speed = Number(dat.speed);
                        if (speed == 1 || speed == 2 || speed == 3 || speed == 4) {
                            Rooms[playerRoom[uid]].settings.speed = dat.speed;
                        }
                        bc(playerRoom[uid], 'WorldMessage', uname + '将速度设置为' + speed);
                    }
                    if (dat.private != undefined) {
                        if (Rooms[playerRoom[uid]] != undefined) {
                            if (String(dat.private) == "true")
                                Rooms[playerRoom[uid]].settings.private = true;
                            else Rooms[playerRoom[uid]].settings.private = false;
                        }
                    }
                    if (dat.map) {
                        let mp = Number(dat.map);
                        if (Rooms[playerRoom[uid]] && (mp == 1 || mp == 2 || mp == 3 || mp == 5 || mp == 6))
                            Rooms[playerRoom[uid]].player[uid].settings.map = mp;
                    }
                }
                if (Rooms[playerRoom[uid]]) {
                    Rooms[playerRoom[uid]].settings.map = getVotedMap(playerRoom[uid]);
                    bc(playerRoom[uid], 'UpdateSettings', Rooms[playerRoom[uid]].settings);
                }
            })

            s.on('AskSize', function () {
                if (Rooms[playerRoom[uid]].game != undefined)
                    ue(uid, 'UpdateSize', Rooms[playerRoom[uid]].game.size);
                ue(uid, 'UpdateUser', Rooms[playerRoom[uid]].player);
            })

            s.on('Ask_GM', function () {
                if (Rooms[playerRoom[uid]] != undefined && Rooms[playerRoom[uid]].game != undefined) {
                    if(Rooms[playerRoom[uid]].game.gm[0][0].type != 3){
                        ue(uid, 'UpdateUser', Rooms[playerRoom[uid]].player);
                        ue(uid, 'UpdateSize', Rooms[playerRoom[uid]].game.size);
                        ue(uid, 'UpdateGM', Rooms[playerRoom[uid]].game.gm);
                        ue(uid, 'Update_Round', Rooms[playerRoom[uid]].game.round);
                    } else {
                        ue(uid, 'Update_Round', `Swal.fire("提示", '这个房间正在排位中,无法观看直播.', "info");`);
                    }
                }
            })

            s.on('UploadMovement', function (dat) {
                if (connectedUsers[uid] == undefined || playerRoom[uid] == undefined) return;
                if (!Rooms[playerRoom[uid]].start || !Rooms[playerRoom[uid]].player[uid].gaming) return;
                Rooms[playerRoom[uid]].player[uid].movement.push(dat);
            })

            s.on('ClearMovement', function () {
                try {
                    Rooms[playerRoom[uid]].player[uid].movement = [];
                    if (Rooms[playerRoom[uid]].game.type == 2) ue(color2Id[Rooms[playerRoom[uid]].player[uid].color], 'select_home');;
                } catch (e) {

                }
            })

            s.on('SendWorldMessage', function (dat) {
                if (dat == "" || dat.length >= 100 || dat.indexOf('\n') != -1) {
                    return;
                }
                dat = dat.trim();
                dat = xss(dat);
                if (dat.indexOf('sur') != -1 || dat.indexOf('viv') != -1) {
                    try {
                        ue(uid, 'WorldMessage', uname + ': ' + dat)
                    } catch (e) { }
                } else { bc('World', 'WorldMessage', uname + ': ' + dat); }
            })

            s.on('eval', function (dat) {
                try {
                    if (uid == 1) eval(dat);
                } catch (e) {

                }
            })
        })
    })
}

module.exports = {
    Run,
    Rooms
}
