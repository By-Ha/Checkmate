function run() {
    const color = ['grey', 'blue', 'red', 'green', 'orange', 'pink', 'purple', 'chocolate', 'maroon'];
    const typeBlock = ['none', 'crown', 'mountain', 'city']
    var size;
    var selectColor = 1;
    var selectType = 0;
    var scrollSize = 30;
    var gm = [];

    function decode(str) {
        var t = window.atob(str);
        var ret = JSON.parse(t);
        return ret;
    }

    function encode() {
        return window.btoa(JSON.stringify(gm));
    }

    function fillIn(x, y) {
        if (selectType == 0) { //blank
            gm[x][y] = { color: 0, type: 0 };
        } else if (selectType == 1) { //crown
            gm[x][y].type = 1;
            gm[x][y].color = selectColor;
        } else if (selectType == 2) { //mountain
            gm[x][y].type = 4;
            gm[x][y].color = 0;
        } else if (selectType == 3) { //city
            gm[x][y].type = 5;
            gm[x][y].color = 0;
        }
        illu();
        $.cookie('editor-map', encode(), { expires: 7 });
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
        // $("#m td").css('width', String(100 / size) + '%');
        // $("#m td").css('height', String(100 / size) + '%');
        $("#m td").click(function () {
            var id = Number(this.id.substr(3));
            var ln = Math.floor((id - 1) / size) + 1, col = (((id % size) == 0) ? size : (id % size));
            fillIn(ln, col);
        })
        illu();
    }

    function illu() {
        for (var i = 0; i <= size; ++i) {
            if (gm[i] == undefined) gm[i] = [];
        }
        for (var i = 0; i <= size; ++i) {
            for (var j = 0; j <= size; ++j) {
                if (gm[i][j] == undefined) gm[i][j] = { color: 0, type: 0 };
            }
        }
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                var d = $("#td-" + String((i - 1) * size + j));
                d[0].innerHTML = " ";
                d.removeClass("unshown");
                d.addClass("shown");
                d.removeClass("blue red orange green grey pink purple chocolate maroon");
                d.addClass(color[gm[i][j].color]);
            }
        }
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (gm[i][j] == undefined) continue;
                $("#td-" + String((i - 1) * size + j)).css('background-size', '100% 100%');
                $("#td-" + String((i - 1) * size + j)).css('background-image', "");
                if (gm[i][j].type == 1) {//crown
                    $("#td-" + String((i - 1) * size + j)).css('background-image', "url('/img/crown.png')");
                } else if (gm[i][j].type == 3) {//city
                    $("#td-" + String((i - 1) * size + j)).css('background-image', "url('/img/city.png')");
                } else if (gm[i][j].type == 4) {//mountain
                    $("#td-" + String((i - 1) * size + j)).css('background-image', "url('/img/mountain.png')");
                } else if (gm[i][j].type == 5) {//empty city
                    $("#td-" + String((i - 1) * size + j)).css('background-image', "url('/img/city.png')");
                }
            }
        }
    }

    $("#size button").click(function () {
        swal('成功', '更换边长至' + this.innerHTML, 'success');
        size = this.innerHTML;
        makeBoard();
    })

    $("#select-color button").click(function () {
        selectColor = Number(this.id.substring(6));
        $("#color-visible").css('background', color[selectColor]);
    })

    $("#type button").click(function () {
        selectType = Number(this.id.substring(5));
        $("#type-visible").css('background', 'url("/img/' + typeBlock[selectType] + '.png")');
        $("#type-visible").css('background-size', '100% 100%');
    })

    $("#reset").click(function () {
        swal("确定?", {
            icon: "warning",
            buttons: {
                cancel: "取消",
                confirm: {
                    text: "确定",
                    icon: "warning",
                    value: "confirm",
                },
            },
        })
            .then((value) => {
                switch (value) {
                    case "confirm":
                        gm = [];
                        illu();
                        swal("重置成功", "", "success");
                        break;

                    case "cancel":
                        swal("取消", "", "success");
                        break;

                    default:
                        swal("取消", "", "success");
                        break;
                }
            });
    })

    $("#export").click(function () {
        gm[0][0] = { 'size': size, 'player': [], 'playerAmount': 0, 'playerData': [] };
        for (var i = 1; i <= size; ++i) {
            for (var j = 1; j <= size; ++j) {
                if (gm[i][j].type == 1) { //crown
                    if (gm[0][0].player.indexOf(gm[i][j].color) == -1) {
                        gm[0][0].player.push(gm[i][j].color);
                    }
                    if (gm[0][0].playerData[gm[i][j].color] == undefined) gm[0][0].playerData[gm[i][j].color] = [];
                    gm[0][0].playerData[gm[i][j].color].push([i, j]);
                }
            }
        }
        gm[0][0].playerAmount = gm[0][0].player.length;
        if (gm[0][0].playerAmount <= 1) {
            swal('显然这是玩不了的', '', 'error');
            return;
        }
        if (gm[0][0].playerAmount > 3 && gm[0][0].size == 10) {
            swal('必须使用更大的地图', '', 'error');
            return;
        }
        if (gm[0][0].playerAmount > 8 && gm[0][0].size == 20) {
            swal('必须使用更大的地图', '', 'error');
            return;
        }
        for (var i = 1; i <= gm[0][0].playerAmount; ++i) {
            if (gm[0][0].player.indexOf(i) == -1) {
                swal('必须按照顺序使用颜色', '', 'error');
                return;
            }
        }
        var exp = encode(gm);
        var ele = document.createElement('a');
        ele.download = "Map_" + md5(exp).substring(0, 10);
        ele.style.display = "none";
        var blob = new Blob([exp]);
        ele.href = URL.createObjectURL(blob);
        document.body.appendChild(ele);
        ele.click();
        document.body.removeChild(ele);
    })

    $("#store").click(function () {
        if ($.cookie('editor-passwd') != "hahaha") {
            swal('无权限', '', 'error');
            return;
        }
        if (gm == 0) {
            console.log("地图为空");
            return;
        }
        if ($("#store-name")[0].value == "") {
            console.log("地图名称不能为空");
            return;
        }
        if (gm[0][0] == undefined || (gm[0][0].size != 10 && gm[0][0].size != 20 && gm[0][0].size != 30)) {
            swal('地图有误', '', 'error');
            return;
        }
        s = io.connect('ws://175.24.85.24:3001/');
        s.emit('thirdPersonMode');
        s.emit('uploadMap', [$("#store-name")[0].value, gm[0][0].size, encode()])
        $("#store-name")[0].value = "";
    })

    $("#import-submit").click(() => {
        var content = $("#import")[0].value;
        gm = decode(content);
        size = Number(gm[0][0].size);
        makeBoard();
        illu();
    })

    $(document).ready(() => {
        $('[data-toggle="tooltip"]').tooltip();
    });

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
            var t1 = Number($("#m").css('margin-left').substr(0,$("#m").css('margin-left').length-2));
            var t2 = Number($("#m").css('margin-top').substr(0,$("#m").css('margin-top').length-2));
            if(delta < 0) t1/=1.2,t2/=1.2;
            // else t1*=1.2,t2*=1.2;
            $(m).css('margin-left',t1+"px");
            $(m).css('margin-top',t2+"px");
        }
    })

    $(document).ready(() => {
        t = Number($.cookie('editor-size'));
        if (t != 10 && t != 20 && t != 30)
            t = 10;
        size = t;
        $.cookie('editor-size', size, { expires: 7 });
        makeBoard();
        illu();
    })

    $(document).ready(() => {
        var box = document.getElementById('m');
        document.onmousedown = function (e) {
            if (!$(e.target).hasClass('unshown') && e.target.id != 'main') return;
            var tx = $(box).css('margin-left');tx = Number(tx.substr(0,tx.length-2));
            var ty = $(box).css('margin-top');ty = Number(ty.substr(0,ty.length-2));
            var disx = e.pageX;
            var disy = e.pageY;
            document.onmousemove = function (e) {
                box.style.marginLeft = e.pageX - disx + tx + 'px';
                box.style.marginTop = e.pageY - disy + ty +  'px';
            }
            document.onmouseup = function () {
                document.onmousemove = document.onmouseup = null;
            }
        }
    })
}
run();