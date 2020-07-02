"use strict";
$(() => {

    let size = 20;
    const color = ['grey', 'blue', 'red', 'green', 'orange', 'pink', 'purple', 'chocolate', 'maroon'];
    const tp = ['', 'crown', '', 'city', 'mountain', 'city', 'obstacle'];
    let gameData;
    let playerInfo = [];
    let gm = [];
    let player = [];
    let round;
    let scrollSize = 30;

    // canvas 相关运行函数
    let c_size = 1000;
    let c = document.getElementById("main-canvas")
    let ctx = c.getContext("2d");

    function drawBoard() {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, c_size, c_size);
        ctx.lineCap = "square";
        ctx.lineWidth = 1;

        for (let i = 0; i <= size; ++i) {
            let h = (c_size / size) * i;
            ctx.moveTo(h, 0);
            ctx.lineTo(h, c_size);
            ctx.stroke();
            ctx.moveTo(0, h);
            ctx.lineTo(c_size, h);
            ctx.stroke();
        }
    }

    function drawIcon(type, y, x) {
        if (!tp[type] || tp[type] == '') return;
        let img = new Image();
        img.src = `/img/${tp[type]}.png`;
        ctx.drawImage(img, (c_size / size) * (x - 1), (c_size / size) * (y - 1), c_size / size, c_size / size);
    }

    function drawColor(c, y, x) {
        ctx.fillStyle = color[c];
        ctx.fillRect((c_size / size) * (x - 1) + 1, (c_size / size) * (y - 1) + 1, c_size / size - 2, c_size / size - 2);
    }

    function drawClear() {
        ctx.clearRect(0, 0, c.width, c.height);
        drawBoard();
    }

    function drawClearBlock(y, x) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect((c_size / size) * (x - 1) + 1, (c_size / size) * (y - 1) + 1, c_size / size - 2, c_size / size - 2);
    }

    function drawText(text, y, x) {
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, (c_size / size) * (x - 0.5), (c_size / size) * (y - 0.25), c_size / size - 2);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // canvas 结束


    function makeBoard() {
        drawBoard();
        c.addEventListener('click', function () {
            var x = event.clientX - c.getBoundingClientRect().left;
            var y = event.clientY - c.getBoundingClientRect().top;
        });
    }

    function reloadSymbol(i, j) {
        drawIcon(gm[i][j].type, i, j);
    }

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

    function combineBlock(f, t, cnt) {
        if (t.color == f.color) { //same color means combine
            t.amount += cnt;
            f.amount -= cnt;
        } else { // not same color need to do delete
            t.amount -= cnt;
            f.amount -= cnt;
            if (t.amount < 0) { // t was cleared
                if (t.type == 1) { // t was player's crown and the player was killed
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

    function illu() {
        playerInfo = [];
        for (let i = 1; i <= size; ++i) {
            for (let j = 1; j <= size; ++j) {
                if (gm == 0) return;
                if (gm[i][j].color != 0) {
                    if (playerInfo[gm[i][j].color] == undefined) playerInfo[gm[i][j].color] = [0, 0, 0];
                    playerInfo[gm[i][j].color][0] += 1;
                    playerInfo[gm[i][j].color][1] += gm[i][j].amount;
                    playerInfo[gm[i][j].color][2] = gm[i][j].color;
                }
                if (gm[i][j].color != 0 || gm[i][j].type != 0) {
                    drawColor(gm[i][j].color, i, j);
                }
                reloadSymbol(i, j);
                if (gm[i][j].amount != 0) {
                    drawText(String(gm[i][j].amount), i, j);
                }
            }
        }
    }

    function getData(data) {
        gameData = JSON.parse(data);
        round = 0;
        player = gameData[0][0][0].player;
        gm = gameData[0];
        size = gm[0][0].size;
        makeBoard();
        illu();
    }

    getData(dat);

    function next() {
        ++round;
        if (round % 10 == 0) addAmountRoad();
        addAmountCity(), addAmountCrown();
        if (gameData[round] == undefined) return;
        else {
            for (var i in gameData[round]) {
                let mv = gameData[round][i];
                if (mv == undefined || mv == 0) continue;
                let f = gm[mv[0]][mv[1]], t = gm[mv[2]][mv[3]];
                try {
                    if (f == undefined || f.color == 0 || f.color != player[i].color) continue;
                } catch (e) {
                    console.log(e);
                }
                combineBlock(f, t, ((mv[4] == 1) ? (Math.ceil((f.amount + 0.5) / 2)) : f.amount) - 1);
            }
        }
        illu();
    }

    if (gameData[0][0][0].version != undefined && gameData[0][0][0].version > 1) {
        alert('回放版本过高,暂不支持.您看到的画面可能错乱而并不能反应真实的回放.');
        // return;
    }

    setInterval(next, 250);

    $(document).ready(() => {
        // 改用canvas暂时取消
        return;
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
        return;
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

document
    .getElementById('main-canvas')
    .addEventListener('click', updateHandler, false)

function updateHandler(e) {
    const box = document.getElementById('main-canvas').getBoundingClientRect()
    const mouseX = Math.round((e.clientX - box.left) * document.getElementById('main-canvas').width / box.width / (c_size / size) + 0.5);
    const mouseY = Math.round((e.clientY - box.top) * document.getElementById('main-canvas').height / box.height / (c_size / size) + 0.5);
    console.log([mouseX, mouseY])
}

