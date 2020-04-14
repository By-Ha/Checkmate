var size = 20;
const color = ['grey', 'blue', 'red', 'green', 'orange', 'pink', 'purple', 'chocolate', 'maroon'];
var movement = [];
var selectNode = [0, 0];// 
var playerInfo = [];
var gm = [];
var init = false;
var round;
var isThirdPerson = false;
var halfTag = false;
var scrollSize = 30;

function changeHalf() {
    halfTag = !halfTag;
    if (halfTag)
        $("#half")[0].innerHTML = "一半派兵";
    else $("#half")[0].innerHTML = "全部派兵";
}
function makeSelect(ln, col) {
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
}
function addMovement(x, y) {
    var t1 = selectNode[0] + x, t2 = selectNode[1] + y;
    if (t1 > size || t1 <= 0 || t2 > size || t2 <= 0) return;
    if (gm[t1][t2] == undefined || gm[t1][t2].type == 4) return;
    if (!halfTag)
        movement.push([0, selectNode[0], selectNode[1], t1, t2, 0]);
    else movement.push([0, selectNode[0], selectNode[1], t1, t2, 1]);
    // console.log(movement[0]);
    clearSelect();
    makeSelect(t1, t2);
}
function makeBoard() {
    m = document.getElementById("m");
    m.innerHTML = "";
    var str = "";
    str += "<tbody>"
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
                var ln = Math.floor((id - 1) / size) + 1, col = (((id % size) == 0) ? size : (id % size));
                console.log(id, ln, col);
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
    return false;
}
function showSymbol() {
    $("#m td").css('background-image', "");
    for (var i = 0; i < movement.length; ++i) {
        var t = movement[i]; id = "#td-" + String((t[1] - 1) * size + t[2]);
        var c = $(id).css('background-image');
        if (c == "null" || c == "none" || !c || c == 0 || c == undefined) c = "";
        else c = c + ',';
        if (t[1] == t[3] + 1) {
            if (c.indexOf('arrow-up.png') != -1) continue;
            $(id).css('background-image', c + "url('img/arrow-up.png')");
        } else if (t[1] == t[3] - 1) {
            if (c.indexOf('arrow-down.png') != -1) continue;
            $(id).css('background-image', c + "url('img/arrow-down.png')");
        } else if (t[2] == t[4] - 1) {
            if (c.indexOf('arrow-right.png') != -1) continue;
            $(id).css('background-image', c + "url('img/arrow-right.png')");
        } else if (t[2] == t[4] + 1) {
            if (c.indexOf('arrow-left.png') != -1) continue;
            $(id).css('background-image', c + "url('img/arrow-left.png')");
        }
    }
    for (var i = 1; i <= size; ++i) {
        for (var j = 1; j <= size; ++j) {
            var c = $("#td-" + String((i - 1) * size + j)).css('background-image');
            if (c == "null" || c == "none" || !c || c == 0 || c == undefined) c = "";
            else c = c + ',';
            if (gm[i][j].type == 1) {//crown
                if (c.indexOf("crown.png") != -1) continue;
                if (isThirdPerson || judgeShown(i, j))
                    $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/crown.png')");
            } else if (gm[i][j].type == 3) {//city
                if (c.indexOf("city.png") != -1 || c.indexOf("obstacle.png") != -1) continue;
                if (isThirdPerson || judgeShown(i, j))
                    $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/city.png')");
                else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/obstacle.png')");
            } else if (gm[i][j].type == 4) {//mountain
                if (c.indexOf("mountain.png") != -1 || c.indexOf("obstacle.png") != -1) continue;
                if (isThirdPerson || judgeShown(i, j))
                    $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/mountain.png')");
                else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/obstacle.png')");
            } else if (gm[i][j].type == 5) {//empty city
                if (c.indexOf("city.png") != -1 || c.indexOf("obstacle.png") != -1) continue;
                if (isThirdPerson || judgeShown(i, j))
                    $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/city.png')");
                else $("#td-" + String((i - 1) * size + j)).css('background-image', c + "url('img/obstacle.png')");
            }
        }
    }
}
function illu() {
    playerInfo = [];
    for (var i = 1; i <= size; ++i) {
        for (var j = 1; j <= size; ++j) {
            var d = $("#td-" + String((i - 1) * size + j));
            d[0].innerHTML = "";
            if (gm == 0) continue;
            if (gm[i][j].color != 0) {
                if (playerInfo[gm[i][j].color] == undefined) playerInfo[gm[i][j].color] = [0, 0, 0];
                playerInfo[gm[i][j].color][0] += 1;
                playerInfo[gm[i][j].color][1] += gm[i][j].amount;
                playerInfo[gm[i][j].color][2] = gm[i][j].color;
            }
            if (gm[i][j].color == myColor) d.addClass("own");
            else d.removeClass("own");
            if (isThirdPerson || judgeShown(i, j)) {
                d[0].innerHTML = (gm[i][j].amount == 0) ? " " : gm[i][j].amount;
                d.removeClass("unshown");
                d.addClass("shown");
                d.removeClass("blue red orange green grey pink purple chocolate maroon");
                d.addClass(color[gm[i][j].color]);
            } else {
                d.removeClass("shown");
                d.addClass("unshown");
                d.removeClass("blue red orange green grey pink purple chocolate maroon");
            }
        }
    }
    showSymbol();
    $("#info-content")[0].innerHTML = "";
    playerInfo.sort(function (a, b) {
        if (a == undefined) return (b == undefined) ? 0 : -1;
        if (b == undefined) return 1;
        if (a[1] == b[1]) return b[0] - a[0];
        return b[1] - a[1];
    })
    for (var i = 0; i < playerInfo.length; ++i) {
        if (playerInfo[i] == undefined) break;
        $("#info-content")[0].innerHTML += "<tr style='color: " + color[playerInfo[i][2]] + ";'><td>"+colorNick[playerInfo[i][2]]+"</td><td>" + Number(playerInfo[i][0]) + "</td><td>" + Number(playerInfo[i][1]) + "</td></tr>"
    }
}
function logged(){
    $("#login-button").css("display", "none");
    $("#user-info")[0].innerHTML = "您的用户名:" + $.cookie("checkmate-login-username");
    $("#user-info").css("display", "unset");
}
document.onkeydown = function (event) {
    var e = event || window.event || arguments.callee.caller.arguments[0];
    if (selectNode[0] == 0 || selectNode[1] == 0 || !e) return;
    if (e.keyCode == 87) { // W
        addMovement(-1, 0);
        showSymbol();
    }
    else if (e.keyCode == 65) { // A
        addMovement(0, -1);
        showSymbol();
    }
    else if (e.keyCode == 83) { // S
        addMovement(1, 0);
        showSymbol();
    }
    else if (e.keyCode == 68) { // D
        addMovement(0, 1);
        showSymbol();
    } else if (e.keyCode == 81) { // Q
        clearMomement();
        showSymbol();
    } else if (e.keyCode == 32) { // Space
        changeHalf();
        showSymbol();
    } else if (e.keyCode == 38) { // ↑
        makeSelect(selectNode[0] - 1, selectNode[1]);
        showSymbol();
    } else if (e.keyCode == 40) { // ↓
        makeSelect(selectNode[0] + 1, selectNode[1]);
        showSymbol();
    } else if (e.keyCode == 37) { // ←
        makeSelect(selectNode[0], selectNode[1] - 1);
        showSymbol();
    } else if (e.keyCode == 39) { // →
        makeSelect(selectNode[0], selectNode[1] + 1);
        showSymbol();
    } else if (e.keyCode == 90) { // Z
        if (movement != undefined && movement.length >= 1) {
            movement = movement.slice(0, -1);
        }
        showSymbol();
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
})
$("#changeUserName")[0].placeholder = $.cookie("UserNick");
$("#changeUserNameSubmit")[0].onclick = function () {
    var n = $("#changeUserName")[0].value;
    if (n == "更改用户名" || n == "" || n == " " || n == "  ") {
        swal("失败", "", 'error');
        return;
    }
    $.cookie("UserNick", n, { expires: 1 });
    console.log($.cookie("UserNick"));
    s.emit('Change Nick', n);
}
$("#third")[0].onclick = function () {
    if ($.cookie("third") == "0" && $("#third")[0].innerHTML == "进入旁观") {
        $.cookie("third", "1", { expires: 1 });
        location.reload();
    } else {
        $.cookie("third", "0", { expires: 1 });
        location.reload();
    }
}
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
        }
        document.onmouseup = function () {
            document.onmousemove = document.onmouseup = null;
        }
    }
})
function encrypt(dat){
    for(var i = 1;i<=10;++i){
        dat = md5("as2khdk143diucx1908" + dat + "Checkmate!");
    }
    return dat;
}
function register(){
    Swal.close();
    setTimeout(() => {
        Swal.fire({
            title: '登录帐号', //标题
            footer: '没有账号?<a href="#" onclick="register()">注册</a>',
            html: `
            <div class="input-group mb-3">
                <div class="input-group-prepend">
                    <span class="input-group-text">Username</span>
                </div>
                <input type="text" class="form-control" placeholder="输入您的用户名" id="register-username" name="username">
            </div>
            <div class="input-group mb-3">
                <div class="input-group-prepend">
                    <span class="input-group-text">Password</span>
                </div>
                <input type="password" class="form-control" placeholder="输入您的密码" id="register-password" name="password">
            </div>
            <div class="input-group mb-3">
                <div class="input-group-prepend">
                    <span class="input-group-text">Repasswd</span>
                </div>
                <input type="password" class="form-control" placeholder="再次输入您的密码" id="register-repassword" name="password">
            </div>
            `,
    
            confirmButtonColor: '#6cf',// 确定按钮的 颜色
            confirmButtonText: '确定',// 确定按钮的 文字
            showCancelButton: true, // 是否显示取消按钮
            cancelButtonText: "取消", // 取消按钮的 文字
        }).then((isConfirm) => {
            try {
                if (isConfirm.value) {
                    var u = $("#register-username")[0].value;
                    var p1 = $("#register-password")[0].value;
                    var p2 = $("#register-repassword")[0].value;
                    if(p1 != p2) {
                        Swal.fire('两次输入密码不同','','error');
                        setTimeout(()=>{
                            register();
                        }, 1000);
                        return ;
                    }
                    if(p1.length <= 2 || p1.length >= 30) {
                        Swal.fire('密码长度不正确','','error');
                        setTimeout(()=>{
                            register();
                        }, 1000);
                        return ;
                    }
                    if(u.length <= 2 || u.length >= 50) {
                        Swal.fire('用户名长度不正确','','error');
                        setTimeout(()=>{
                            register();
                        }, 1000);
                        return ;
                    }
                    $.cookie("checkmate-login-username", u, { expires: 7 });
                    $.cookie("checkmate-login-password", encrypt(p1), { expires: 7 });
                    s.emit('RegisterV2', u , encrypt(p1));
                }
            } catch (e) {
                console.error(e);
            }
        });
    }, 100);
}
$("#login-button").click(() => {
    Swal.fire({
        title: '登录帐号', //标题
        footer: '没有账号?<a href="#" onclick="register()">注册</a>',
        html: `
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text">Username</span>
            </div>
            <input type="text" class="form-control" placeholder="输入您的用户名" id="login-username" name="username">
        </div>
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text">Password</span>
            </div>
            <input type="password" class="form-control" placeholder="输入您的密码" id="login-password" name="password">
        </div>
        `,

        confirmButtonColor: '#6cf',// 确定按钮的 颜色
        confirmButtonText: '确定',// 确定按钮的 文字
        showCancelButton: true, // 是否显示取消按钮
        cancelButtonText: "取消", // 取消按钮的 文字
    }).then((isConfirm) => {
        try {
            if (isConfirm.value) {
                var u = $("#login-username")[0].value;
                var p = $("#login-password")[0].value;
                $.cookie("checkmate-login-username", u, { expires: 7 });
                $.cookie("checkmate-login-password", encrypt(p), { expires: 7 });
                s.emit("LoginV2", u, encrypt(p));
            }
        } catch (e) {
            console.error(e);
        }
    });
})