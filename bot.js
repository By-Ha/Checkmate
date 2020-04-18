var event = require('events');

function bot(s, myColor) {
    var gm;
    var size;
    var myColor;
    var crownX, crownY;
    var seen = false;
    var dangerCount = 0;
    var dangerFix = 2;
    var playerInfo = [];
    var playerCrown = [];
    var movement = [];
    var movingHome = false;
    var kill = false;
    var exe = false;
    var isAlive = true;
    var round = 0;

    /** test */

    /**
     * is a block visible?
     * @visible
     */
    function visible(i, j) {
        if (gm[i][j].color == myColor) return true;
        if (i - 1 >= 1 && gm[i - 1][j].color == myColor) return true;
        if (j - 1 >= 1 && gm[i][j - 1].color == myColor) return true;
        if (i + 1 <= size && gm[i + 1][j].color == myColor) return true;
        if (j + 1 <= size && gm[i][j + 1].color == myColor) return true;
        if (i + 1 <= size && j + 1 <= size && gm[i + 1][j + 1].color == myColor) return true;
        if (i + 1 <= size && j - 1 >= 1 && gm[i + 1][j - 1].color == myColor) return true;
        if (i - 1 >= 1 && j + 1 <= size && gm[i - 1][j + 1].color == myColor) return true;
        if (i - 1 >= 1 && j - 1 >= 1 && gm[i - 1][j - 1].color == myColor) return true;
        return false;
    }

    function dist(i, j, ii, jj, pow = 1) {
        return Math.pow(Math.abs(i - ii) + Math.abs(j - jj), pow);
    }

    /**
     * 
     * @param {Number} i 
     * @param {Number} j 
     * @param {Number} di
     * @param {Number} dj
     */
    function addMovement(i, j, di, dj, halfTag = false, ahead = false, ret = false) {
        var t1 = i + di, t2 = j + dj;
        if (t1 > size || t1 <= 0 || t2 > size || t2 <= 0) return;
        // if (gm[t1] == undefined || gm[t1][t2] == undefined || gm[t1][t2].type == 4) return;
        if (ret)
            if (!halfTag)
                return [i, j, t1, t2, 0];
            else return [i, j, t1, t2, 1];
        if (!ahead)
            if (!halfTag)
                movement.push([i, j, t1, t2, 0]);
            else movement.push([i, j, t1, t2, 1]);
        else if (!halfTag)
            movement = [[i, j, t1, t2, 0]].concat(movement);
        else movement = [[i, j, t1, t2, 1]].concat(movement);
    }

    function makeLineDFS(i, j, di, dj, cost, maxCost, vis){
        if(cost > maxCost) return ;
        if(dist(i, j, di, dj, 1) == 0) {
            // console.log("arrive");
            return [[],[[i, j]]];
        }
        var dx = [0, 0, 1, -1];
        var dy = [1, -1, 0, 0];
        for(var h = 0;h < 4;++h){
            var a = i + dx[h],b = j + dy[h];
            if(a <= 0 || b <= 0 || a > size || b > size || gm[a][b].type == 4) continue;
            if(vis[a] == undefined) vis[a] = [];
            if(vis[a][b] != undefined) continue;
            vis[a][b] = true;
            if(cost + 1 + dist(a, b, di, dj, 1) <= maxCost){
                var t = makeLineDFS(a, b, di, dj, cost + 1, maxCost, vis);
                if(t != undefined) {
                    if(i == crownX && j == crownY) t[0] = [[i, j, a, b, 1]].concat(t[0]);
                    else t[0] = [[i, j, a, b, 0]].concat(t[0]);
                    t[1] = [[i, j]].concat(t[1]);
                    return t;
                }
            }
        }
        return undefined;
    }

    function makeLine(i, j, di, dj) {
        for(var f = 0;f<=10000;++f){// max support 100 * 100
            t = makeLineDFS(i, j, di, dj, 0, f, []);
            if(t != undefined){
                return t;
            }
        }
        console.log('BotMakeLineError', i, j, di, dj);
    }

    /**
     * 
     * @param {Number} i 
     * @param {Number} j 
     * @param {Number} amount 
     */
    function callAmount(i, j, amount) {
        var l = []; var vis = []; var plc = []; var flag = 0;
        var tmpMovement = [];
        var calledAmount = 0;
        var node = new Set();
        l.push([i, j]);
        vis[i] = []; vis[i][j] = true;
        while (l.length != 0) {
            var dx = [0, 0, 1, -1];
            var dy = [1, -1, 0, 0];
            for (var t = 0; t < 4; ++t) {
                var a = l[0][0] + dx[t], b = l[0][1] + dy[t];
                if (a <= 0 || a > size || b <= 0 || b > size || gm[a][b].type == 4) continue;
                if (vis[a] == undefined) vis[a] = [];
                if (vis[a][b] != undefined) {
                    continue;
                }
                vis[a][b] = true;
                if (gm[a][b].color == myColor) {
                    if ((a != i || b != j) && a <= size && b <= size && a > 0 && b > 0){
                        calledAmount += (gm[a][b].amount - 1);
                        if(gm[a][b].amount - 1 > 0) plc.push([a, b]);
                    }
                    if (calledAmount >= amount) { flag = 1; break; }
                }
                l.push([a, b]);
            }
            if (flag) break;
            l = l.slice(1);
        }
        node.add([i, j]);
        while (plc.length) {
            var minDist = 999999, minX = 1, minY = 1;
            node.forEach((v) => {
                if (minDist > dist(v[0], v[1], plc[0][0], plc[0][1])) {
                    minDist = dist(v[0], v[1], plc[0][0], plc[0][1]);
                    minX = v[0]; minY = v[1];
                }
            })
            var t = makeLine(plc[0][0], plc[0][1], minX, minY);
            tmpMovement = t[0].concat(tmpMovement);
            t[1].forEach((v) => {
                node.add(v);
            })
            plc = plc.slice(1);
        }
        
        movement = movement.concat(tmpMovement);
        // console.log(tmpMovement, movement);
    }

    /**
     * @function expand
     */
    function expand() {
        for(var i = 1;i<=size;++i){
            for(var j = 1;j<=size;++j){
                if(visible(i,j) && gm[i][j].type == 5 && gm[i][j].amount < 10){
                    callAmount(i, j, gm[i][j].amount+5);
                    return ;
                }
            }
        }
        for(var k = 1; k <= 1000; ++k){
            var i = Math.round(Math.random()*size); if(i == 0) i = size;
            var j = Math.round(Math.random()*size); if(j == 0) j = size;
            if(gm[i][j].color == myColor){
                var arr = [[i-1,j],[i+1,j],[i,j-1],[i,j+1]];
                arr.sort(function(){ return 0.5 - Math.random() });
                for(var t = 0;t < 4;++t){
                    if(arr[t][0] > size || arr[t][0] <= 0 || arr[t][1] > size || arr[t][1] <= 0) continue;
                    if(gm[arr[t][0]][arr[t][1]].color != 0 || gm[arr[t][0]][arr[t][1]].type == 4) continue; 
                    if(round <= 40 && gm[arr[t][0]][arr[t][1]].type == 5) continue;
                    callAmount(arr[t][0], arr[t][1], gm[arr[t][0]][arr[t][1]].amount + 1);
                    return ;
                }
            }
        }
        callAmount(crownX, crownY, 100);
    }

    /**
     * judge whether crown seen
     * @function judgeSeen
     */
    function judgeSeen() {
        if (crownX - 1 >= 1 && gm[crownX - 1][crownY].color != myColor) return true;
        if (crownY - 1 >= 1 && gm[crownX][crownY - 1].color != myColor) return true;
        if (crownX + 1 <= size && gm[crownX + 1][crownY].color != myColor) return true;
        if (crownY + 1 <= size && gm[crownX][crownY + 1].color != myColor) return true;
        if (crownX + 1 <= size && crownY + 1 <= size && gm[crownX + 1][crownY + 1].color != myColor) return true;
        if (crownX + 1 <= size && crownY - 1 >= 1 && gm[crownX + 1][crownY - 1].color != myColor) return true;
        if (crownX - 1 >= 1 && crownY + 1 <= size && gm[crownX - 1][crownY + 1].color != myColor) return true;
        if (crownX - 1 >= 1 && crownY - 1 >= 1 && gm[crownX - 1][crownY - 1].color != myColor) return true;
    }

    /**
     * judge danger level
     * @function analyze
     */
    function analyze() {
        playerInfo = [];
        dangerCount = 0;
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (!visible(i, j) || gm[i][j].color == 0) continue;
                if (gm[i][j].color != myColor) {
                    dangerCount += gm[i][j].amount * 5 / dist(i, j, crownX, crownY, dangerFix);
                }
                if (gm[i][j].color != 0) {
                    if (playerInfo[gm[i][j].color] == undefined) playerInfo[gm[i][j].color] = [0, 0, 0];
                    playerInfo[gm[i][j].color][0] += 1;
                    playerInfo[gm[i][j].color][1] += gm[i][j].amount;
                    playerInfo[gm[i][j].color][2] = gm[i][j].color;
                }
            }
        }
        seen = judgeSeen();
        if (seen) dangerFix = 1;
    }

    /**
     * do the choice
     * @function execute
     */
    function execute() {
        if (!movement.length) movingHome = false;
        if (movingHome) return;
        analyze();
        // console.log("dangerCount", dangerCount, playerInfo[myColor][1] * 0.5);
        if (/* dangerCount > playerInfo[myColor][1] * 0.5 && */ dangerCount > gm[crownX][crownY] * 0.8 && !kill) {
            // console.log(1);
            movement = [];
            callAmount(crownX, crownY, 0.8 * (playerInfo[myColor] - gm[crownX][crownY].amount));
            movingHome = true; kill = false;
        } else if(movement.length) {
            return ;
        }else if (Math.random() <= 0.5 && !kill) {
            // console.log(2);
            expand();
        } else {
            // console.log(3);
            for (var i = 1; i <= size; ++i) {
                for (var j = 1; j <= size; ++j) {
                    if (visible(i, j) && gm[i][j].color != myColor && (playerInfo[gm[i][j].color] != undefined && playerInfo[gm[i][j].color][1] <= playerInfo[myColor][1] * 0.8)) {
                        kill = true;
                        callAmount(i, j, Math.ceil(gm[i][j].amount * 1.5));
                        return;
                    }
                }
            }
            kill = false;
            expand();
        }
    }

    function init() {
        playerCrown = [];
        seen = false;
        dangerFix = 2;
        movingHome = false;
    }

    //test
    var init = false;
    var movementUploader;

    s.on('UpdateGM', function (dat) {
        gm = dat;exe = false;
        if (!init) s.emit('AskSize', null);
    })

    s.on('UpdateSize', function (dat) {
        size = dat;
        init = true;
    })

    s.on('GameStart', function () {
        round = 0;
        playerCrown = [];
        seen = false;
        dangerFix = 2;
        movingHome = false;
        movement = [];
        
        setTimeout(() => {
            for (var i = 1; i <= size; ++i) {
                for (var j = 1; j <= size; ++j) {
                    if (gm[i][j].color == myColor) {
                        crownX = i, crownY = j;
                        break;
                    }
                }
            }
            movementUploader = setInterval(() => {
                ++round;
                // console.log(movement);
                if (movement != undefined && movement != 0) {
                    s.emit('UploadMovement', movement[0]);
                    // console.log("UploadMovement", movement);
                }
                else s.emit('UploadMovement', []);
                if(!exe)
                    execute(), exe=true;
            }, 50);
        }, 1000);
    })

    s.on('DeleteMovement', function () {
        if (movement.length)
            movement = movement.slice(1);
        while (movement.length) {
            if (gm[movement[0][0]][movement[0][1]].color != myColor || gm[movement[0][0]][movement[0][1]].amount <= 1) movement = movement.slice(1);
            else break;
        }
    })

    s.on('die', function () {
        gm=undefined, movement=undefined;
        playerInfo=undefined;
        clearInterval(movementUploader);
    });

    s.on('WinAnction', function (dat) {
        gm=undefined, movement=undefined;
        playerInfo=undefined;
        clearInterval(movementUploader);
    })

    // eventemitter
}
module.exports = {
    bot
}