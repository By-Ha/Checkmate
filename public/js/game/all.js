"use strict";
$(() => {
    let s = io.connect('ws://175.24.85.24:3001/');

    let nick = "";
    let roomName = "";
    let User;
    let colorNick = [];
    let myColor;
    let movementUploader;
    let init = false;
    let start = false;

    let size = 20;
    const color = ['grey', 'blue', 'red', 'green', 'orange', 'pink', 'purple', 'chocolate', 'maroon'];
    let movement = [];
    let selectNode = [0, 0];
    let playerInfo = [];
    let gm = [];
    let round;
    let isThirdPerson = false;
    let halfTag = false;
    let scrollSize = 30;


    function voteStart(i) {
        s.emit('VoteStart', i);
    }

    s.on('connect', function () {
        s.emit('joinRoom', room);
    });

    s.on('LoggedUserCount', function (dat) {
        $("#total-user")[0].innerHTML = dat[0];
        $("#ready-user")[0].innerHTML = dat[1];
    });
    s.on('UpdateGM', function (dat) {
        $("#l").css('visibility', 'hidden');
        gm = dat;
        if (!init) s.emit('AskSize', null);
        if (init) illu();
    });
    s.on('UpdateUser', function (dat) {
        User = dat;
        colorNick = [];
        for (var k in User) {
            colorNick[User[k].color] = User[k].uname;
        }
    });
    s.on('UpdateColor', function (dat) {
        myColor = dat;
    });
    s.on('UpdateSize', function (dat) {
        size = dat;
        makeBoard();
        init = true;
    });
    s.on('GameStart', function () {
        round = 0; movement = [];
        start = true;
        movementUploader = setInterval(() => {
            if (start == false) clearInterval(movementUploader);
            if (movement != undefined && movement != 0) {
                if (movement[0][0] == 0)
                    s.emit('UploadMovement', movement[0].slice(1));
            }
        }, 50);
    });
    s.on('ReceiveMovement', function (dat) {
        if (movement != undefined && movement != 0) {
            if (dat[0] == movement[1] && dat[1] == movement[2] && dat[2] == movement[3] && dat[3] == movement[4])
                movement[0][0]++;
        }
    });
    s.on('UpdateRound', function (dat) {
        round = dat;
    });
    s.on('ClearMovement', function () {
        while (movement.length) {
            if (gm[movement[0][1]][movement[0][2]].color != myColor || gm[movement[0][1]][movement[0][2]].amount <= 1) movement = movement.slice(1);
            else break;
        }
    });
    s.on('DeleteMovement', function () {
        if (movement.length && movement[0][0]) {
            movement = movement.slice(1);
        }
        while (movement.length) {
            if (gm[movement[0][1]][movement[0][2]].color != myColor || gm[movement[0][1]][movement[0][2]].amount <= 1) {
                let t1 = movement[0][1];
                let t2 = movement[0][2];
                movement = movement.slice(1);
                reloadSymbol(t1, t2, true);
            }
            else break;
        }
    });
    s.on('WinAnction', function (dat) {
        start = false;
        Swal.fire("欢呼", dat + "赢了", "success");
        $("#l").css('visibility', 'unset');
    });
    s.on('isGameStart', function (dat) {
        if (dat) {
            s.emit('getUser');
            $("#ready").css('visibility', 'hidden');
        }
    });
    s.on('ForceThird', function () {
        $.cookie("third", "1", { expires: 1 });
        location.reload();
    });
    s.on('die', function () {
        Swal.fire("您死了!", "", 'warning');
        setTimeout(() => {
            location.reload();
        }, 500);
    });
    s.on('swal', function (dat, func) {
        Swal.fire(dat);
        if (func != undefined)
            eval(func);
    });
    s.on('execute', (cmd) => {
        eval(cmd);
    });
    s.on('WorldMessage', (msg) => {//
        let t = $("<p></p>").appendTo("#msg-container");
        t[0].innerHTML = "&nbsp&nbsp&nbsp&nbsp" + String(String(msg));
        $("#msg-container")[0].scrollTop = 99999999;
    });
    $("#ready")[0].onclick = function () {
        if (this.innerHTML == "准备") {
            voteStart(1);
            this.innerHTML = "取消准备";
        } else {
            voteStart(0);
            this.innerHTML = "准备";
        }
    };
    $(() => {
        $("#settings-gamespeed-input input").on('input propertychange', () => {
            let speed = $("#settings-gamespeed-input input")[0].value;
            if (speed != 1 && speed != 2 && speed != 3 && speed != 4) return;
            $("#settings-gamespeed-input-display")[0].innerHTML = speed;
            s.emit('changeSettings', { speed: speed });
        });
        $("#settings-gameprivate input").on("change", function () {
            s.emit('changeSettings', { private: $("#settings-gameprivate input")[0].checked });
        });
        s.on('UpdateSettings', function (dat) {
            $("#settings-gamespeed-input input")[0].value = dat.speed;
            $("#settings-gamespeed-input-display")[0].innerHTML = dat.speed;
            $("#settings-gameprivate input")[0].checked = dat.private;
        });
    });
    function changeHalf(half = true) {
        halfTag = half;
        if (halfTag)
            $("#half")[0].innerHTML = "一半派兵";
        else $("#half")[0].innerHTML = "全部派兵";
    }
    function makeSelect(ln, col) {
        if (document.activeElement.id == "msg-sender") return;
        if (ln > size || col > size || ln <= 0 || col <= 0) return;
        $("td").removeClass("selected");
        selectNode[0] = ln;
        selectNode[1] = col;
        if (col != 1) $("#td-" + Number(((ln - 1) * size + col - 1))).addClass("selected");
        if (col != size) $("#td-" + Number(((ln - 1) * size + col + 1))).addClass("selected");
        $("#td-" + Number(((ln - 2) * size + col))).addClass("selected");
        $("#td-" + Number(((ln) * size + col))).addClass("selected");
    }
    function clearSelect() {
        $("td").removeClass("selected");
        selectNode[0] = selectNode[1] = 0;
    }
    function clearMomement() {
        movement = [];
        showSymbol(false);
    }
    function addMovement(x, y) {
        if (document.activeElement.id == "msg-sender") return;
        var t1 = selectNode[0] + x, t2 = selectNode[1] + y;
        if (t1 > size || t1 <= 0 || t2 > size || t2 <= 0) return;
        if (gm[t1][t2] == undefined || gm[t1][t2].type == 4) return;
        if (!halfTag)
            movement.push([0, selectNode[0], selectNode[1], t1, t2, 0]);
        else movement.push([0, selectNode[0], selectNode[1], t1, t2, 1]);
        clearSelect();
        makeSelect(t1, t2);
    }
    function makeBoard() {
        let m = document.getElementById("m");
        m.innerHTML = "";
        var str = "";
        str += "<tbody>";
        for (var i = 1; i <= size; ++i) {
            str += "<tr >";
            for (var j = 1; j <= size; ++j) {
                str += "<td id=\"td-" + ((i - 1) * size + j) + "\">" + String((i - 1) * size + j) + "</td>";
            }
            str += "</tr>";
        }
        str += "</tbody>";
        $(m).append(str);
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                $("#td-" + String((i - 1) * size + j))[0].onclick = function () {
                    var id = Number(this.id.substr(3));
                    var ln = Math.floor((id - 1) / size) + 1, col = Number((((id % size) == 0) ? size : (id % size)));
                    if (gm[ln][col].color == myColor) {
                        makeSelect(ln, col);
                    }
                }
            }
        }
    }
    function judgeShown(i, j) {
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
    function reloadSymbol(i, j, clear = false) {
        let c = "";
        if (!clear) c = $("#td-" + String((i - 1) * size + j)).css('background-image');
        if (c == "null" || c == "none" || !c || c == 0 || c == undefined) c = "";
        else c = c + ',';
        if (gm[i][j].type == 1) {//crown
            if (c.indexOf("crown.png") != -1) return;
            if (!start || judgeShown(i, j))
                $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/crown.png')");
        } else if (gm[i][j].type == 3) {//city
            if (c.indexOf("city.png") != -1 || c.indexOf("obstacle.png") != -1) return;
            if (!start || judgeShown(i, j))
                $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/city.png')");
            else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/obstacle.png')");
        } else if (gm[i][j].type == 4) {//mountain
            if (c.indexOf("mountain.png") != -1 || c.indexOf("obstacle.png") != -1) return;
            if (!start || judgeShown(i, j))
                $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/mountain.png')");
            else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/obstacle.png')");
        } else if (gm[i][j].type == 5) {//empty city
            if (c.indexOf("city.png") != -1 || c.indexOf("obstacle.png") != -1) return;
            if (!start || judgeShown(i, j))
                $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/city.png')");
            else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('/img/obstacle.png')");
        }
    }
    function showSymbol(onlyLast = false) {
        if (!onlyLast) // 10%
            $("#m td").css('background-image', "");
        for (let i = (onlyLast ? Math.max(movement.length - 1, 0) : 0); i < movement.length; ++i) {
            let t = movement[i];
            let id = "#td-" + String((t[1] - 1) * size + t[2]);
            var c = $(id).css('background-image');
            if (c == "null" || c == "none" || !c || c == 0 || c == undefined) c = "";
            else c = c + ',';
            if (t[1] == t[3] + 1) {
                if (c.indexOf('arrow-up.png') != -1) continue;
                $(id).css('background-image', c + "url('/img/arrow-up.png')");
            } else if (t[1] == t[3] - 1) {
                if (c.indexOf('arrow-down.png') != -1) continue;
                $(id).css('background-image', c + "url('/img/arrow-down.png')");
            } else if (t[2] == t[4] - 1) {
                if (c.indexOf('arrow-right.png') != -1) continue;
                $(id).css('background-image', c + "url('/img/arrow-right.png')");
            } else if (t[2] == t[4] + 1) {
                if (c.indexOf('arrow-left.png') != -1) continue;
                $(id).css('background-image', c + "url('/img/arrow-left.png')");
            }
        }
        if (!onlyLast) {
            for (var i = 1; i <= size; ++i) {
                if (gm[i] == undefined) continue;
                for (var j = 1; j <= size; ++j) {
                    reloadSymbol(i, j);
                }
            }
        }
    }
    function illu() {
        playerInfo = [];// 12%
        let doc = document;
        for (let t1 = 1; t1 <= size; ++t1) {
            for (let t2 = 1; t2 <= size; ++t2) {
                setTimeout(() => {
                    let i = t1, j = t2;
                    if (gm == 0) return;
                    if (gm[i][j].color != 0) {
                        if (playerInfo[gm[i][j].color] == undefined) playerInfo[gm[i][j].color] = [0, 0, 0];
                        playerInfo[gm[i][j].color][0] += 1;
                        playerInfo[gm[i][j].color][1] += gm[i][j].amount;
                        playerInfo[gm[i][j].color][2] = gm[i][j].color;
                    }
                    let d = doc.getElementById("td-" + String((i - 1) * size + j));
                    d.innerHTML = "";
                    if (d.classList.contains("selected")) {
                        d.classList = "selected";
                    } else {
                        d.classList = "";
                    }
                    if (gm[i][j].color == myColor) d.classList.add("own");
                    if (!start || judgeShown(i, j)) {
                        d.innerHTML = (gm[i][j].amount == 0) ? " " : gm[i][j].amount;
                        d.classList.add("shown");
                        d.classList.add(color[gm[i][j].color]);
                    } else {
                        d.classList.add("unshown");
                    }
                }, 0);
            }
        }
        setTimeout(() => { showSymbol(false); }, 0);
        setTimeout(() => {
            $("#info-content")[0].innerHTML = "";
            playerInfo.sort(function (a, b) {
                if (a == undefined) return (b == undefined) ? 0 : -1;
                if (b == undefined) return 1;
                if (a[1] == b[1]) return b[0] - a[0];
                return b[1] - a[1];
            });
            for (var i = 0; i < playerInfo.length; ++i) {
                if (playerInfo[i] == undefined) break;
                $("#info-content")[0].innerHTML += "<tr style='color: " + color[playerInfo[i][2]] + ";'><td>" + colorNick[playerInfo[i][2]] + "</td><td>" + Number(playerInfo[i][0]) + "</td><td>" + Number(playerInfo[i][1]) + "</td></tr>"
            }
        }, 50);
    }
    document.onkeydown = function (event) {
        var e = event || window.event || arguments.callee.caller.arguments[0];
        if (!e) return;
        if (e.keyCode == 87) { // W
            addMovement(-1, 0);
            showSymbol(true);
            changeHalf(false);
        } else if (e.keyCode == 65) { // A
            addMovement(0, -1);
            showSymbol(true);
            changeHalf(false);
        } else if (e.keyCode == 83) { // S
            addMovement(1, 0);
            showSymbol(true);
            changeHalf(false);
        } else if (e.keyCode == 68) { // D
            addMovement(0, 1);
            showSymbol(true);
            changeHalf(false);
        } else if (e.keyCode == 81) { // Q
            clearMomement();
            showSymbol();
        } else if (e.keyCode == 90) { // Z
            changeHalf(!halfTag);
            showSymbol();
        } else if (e.keyCode == 38) { // ↑
            makeSelect(selectNode[0] - 1, selectNode[1]);
            showSymbol(true);
        } else if (e.keyCode == 40) { // ↓
            makeSelect(selectNode[0] + 1, selectNode[1]);
            showSymbol(true);
        } else if (e.keyCode == 37) { // ←
            makeSelect(selectNode[0], selectNode[1] - 1);
            showSymbol(true);
        } else if (e.keyCode == 39) { // →
            makeSelect(selectNode[0], selectNode[1] + 1);
            showSymbol(true);
        } else if (e.keyCode == 13) { // Enter
            if (document.activeElement.id == "msg-sender") {
                s.emit('SendWorldMessage', $("#msg-sender")[0].value);
                $("#msg-sender")[0].value = "";
                $("#msg-sender").blur();
            } else {
                $("#msg-sender").focus();
            }
        }
    };
    $(document).ready(() => {
        //兼容性写法，该函数也是网上别人写的，不过找不到出处了，蛮好的，所有我也没有必要修改了
        //判断鼠标滚轮滚动方向
        if (window.addEventListener)//FF,火狐浏览器会识别该方法
            window.addEventListener('DOMMouseScroll', wheel, false);
        window.onmousewheel = document.onmousewheel = wheel;//W3C
        //统一处理滚轮滚动事件
        function wheel(event) {
            var delta = 0;
            if (!event) event = window.event;
            if (event.wheelDelta) {//IE、chrome浏览器使用的是wheelDelta，并且值为“正负120”
                delta = event.wheelDelta / 120;
                if (window.opera) delta = -delta;//因为IE、chrome等向下滚动是负值，FF是正值，为了处理一致性，在此取反处理
            } else if (event.detail) {//FF浏览器使用的是detail,其值为“正负3”
                delta = -event.detail / 3;
            }
            if (delta)
                handle(delta);
        }
        //上下滚动时的具体处理函数
        function handle(delta) {
            if (delta < 0) scrollSize /= 1.2; //向下滚动
            else scrollSize *= 1.2; //向上滚动
            if (scrollSize <= 20) { scrollSize *= 1.2; return; }
            else if (scrollSize >= 500) { scrollSize /= 1.2; return; }
            var str = "#m td{width: " + String(scrollSize) + "px;max-width: " + String(scrollSize) + "px;min-width: " + String(scrollSize) + "px;height: " + String(scrollSize) + "px;max-height: " + String(scrollSize) + "px;min-height: " + String(scrollSize) + "px;}";
            $("#font-size-control")[0].innerHTML = str;
            var t1 = Number($("#m").css('margin-left').substr(0, $("#m").css('margin-left').length - 2));
            var t2 = Number($("#m").css('margin-top').substr(0, $("#m").css('margin-top').length - 2));
            if (delta < 0) t1 /= 1.2, t2 /= 1.2;
            // else t1*=1.2,t2*=1.2;
            $(m).css('margin-left', t1 + "px");
            $(m).css('margin-top', t2 + "px");
        }
    });

    $(document).ready(() => {
        var box = document.getElementById('m');
        document.onmousedown = function (e) {
            if (!$(e.target).hasClass('unshown') && e.target.id != 'main') return;
            var tx = $(box).css('margin-left'); tx = Number(tx.substr(0, tx.length - 2));
            var ty = $(box).css('margin-top'); ty = Number(ty.substr(0, ty.length - 2));
            var disx = e.pageX;
            var disy = e.pageY;
            document.onmousemove = function (e) {
                box.style.marginLeft = e.pageX - disx + tx + 'px';
                box.style.marginTop = e.pageY - disy + ty + 'px';
            };
            document.onmouseup = function () {
                document.onmousemove = document.onmouseup = null;
            };
        }
    });

});