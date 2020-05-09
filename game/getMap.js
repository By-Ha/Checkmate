var path = require("path");
var fs = require("fs");
var md = [];
var gm = [];

function decode(t) {
    var ret = JSON.parse(t);
    return ret;
}
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function encodeUnicode(str) {
    var res = [];
    for (var i = 0; i < str.length; i++) {
        res[i] = ("00" + str.charCodeAt(i).toString(16)).slice(-4);
    }
    return "\\u" + res.join("\\u");
}
function decodeUnicode(str) {
    str = str.replace(/\\/g, "%");
    return unescape(str);
}
function getFile(pathName = "public/maps/2") {
    var files = fs.readdirSync(pathName);
    var dirs = [];
    var finish = false;
    for (var i = 0; i < files.length; ++i) {
        var data = fs.statSync(path.join(pathName, files[i]));
        if (data.isFile()) {
            dirs.push(files[i]);
        }
    }
    return dirs;
}

function calcAmount(i, j) {
    if (md[i][j].type == 1) return 1;
    if (md[i][j].type == 5) return getRandomNumber(40, 50);
    return 0;
}

function randomGetFile(size, player) {
    var fpath = "../game/maps/" + String(size);
    var flist = getFile(fpath);
    if (flist.length) {
        gm = md = [];
        var playernow = 0;
        var Mname;
        while (playernow < player) {
            Mname = flist[getRandomNumber(0, flist.length - 1)];
            var buff = new Buffer.from(fs.readFileSync(fpath + '/' + Mname).toString(), 'base64');
            md = decode(buff.toString('ascii'));
            playernow = md[0][0].playerAmount;
        }
        var size = md[0][0].size;
        for (var i = 0; i <= size; ++i) gm.push([]);
        for (var i = 1; i <= size; ++i) {
            gm[i].push({});
            for (var j = 1; j <= size; ++j)
                if (md[i][j].color <= player)
                    gm[i].push({ 'color': md[i][j].color, 'amount': calcAmount(i, j), 'type': md[i][j].type });
                else gm[i].push({ 'color': 0, 'amount': 0, 'type': 0 });
        }
        for (var i = 1; i <= player; ++i) {
            for (var j = 0; j < md[0][0].playerData[i].length; ++j) {
                t = md[0][0].playerData[i][j];
                gm[t[0]][t[1]] = { 'color': 0, 'amount': 0, 'type': 0 };
            }
            var r = getRandomNumber(0, md[0][0].playerData[i].length - 1);
            t = md[0][0].playerData[i][r];
            gm[t[0]][t[1]] = { 'color': i, 'amount': 1, 'type': 1 };
        }
        return gm;
    } else return [];
}

function randomGetFileV2(player) {
    var fpath = "./game/maps/" + String(player);
    var flist = getFile(fpath);
    if (flist.length) {
        gm = md = [];
        var playernow = 0;
        var Mname;
        Mname = flist[getRandomNumber(0, flist.length - 1)];
        var buff = new Buffer.from(fs.readFileSync(fpath + '/' + Mname).toString());
        md = decode(buff.toString('ascii'));
        md[0][0].mapName = decodeUnicode(md[0][0].mapName);
        playernow = md[0][0].playerAmount;
        var size = md[0][0].size;
        for (var i = 0; i <= size; ++i) gm.push([]);
        gm[0][0] = md[0][0];
        for (var i = 1; i <= size; ++i) {
            gm[i].push({});
            for (var j = 1; j <= size; ++j)
                if (md[i][j].color <= player)
                    gm[i].push({ 'color': md[i][j].color, 'amount': calcAmount(i, j), 'type': md[i][j].type });
                else gm[i].push({ 'color': 0, 'amount': 0, 'type': 0 });
        }
        for (var i = 1; i <= player; ++i) {
            for (var j = 0; j < md[0][0].playerData[i].length; ++j) {
                t = md[0][0].playerData[i][j];
                gm[t[0]][t[1]] = { 'color': 0, 'amount': 0, 'type': 0 };
            }
            var r = getRandomNumber(0, md[0][0].playerData[i].length - 1);
            t = md[0][0].playerData[i][r];
            gm[t[0]][t[1]] = { 'color': i, 'amount': 1, 'type': 1 };
        }
        return gm;
    } else return [];
}

module.exports = {
    randomGetFile,
    randomGetFileV2
}