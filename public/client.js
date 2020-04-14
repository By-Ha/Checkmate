s = io.connect('ws://175.24.85.24:3001/');

var nick = "";
var roomName = "";
var User;
var colorNick = [];
var myColor;
var movementUploader;
var init = false;


function voteStart(i) {
    s.emit('VoteStart', i);
}
s.on('connect', function () {
    console.log("Connected:", s.id);
    // var nick = "";
    // if ($.cookie("UserNick") != undefined) {
    //     nick = $.cookie("UserNick");
    // } else {
    //     while (nick == "") {
    //         nick = prompt("请输入您的昵称", "匿名玩家");
    //     }
    //     $.cookie("UserNick", nick, { expires: 1 });
    // }
    // s.emit('Login', nick);
    // voteStart(0);
    s.emit('AutoLoginV2', $.cookie("checkmate-login-username"), $.cookie("checkmate-login-password"))
})
s.on('LoggedUserCount', function (dat) {
    $("#total-user")[0].innerHTML = dat[0];
    $("#ready-user")[0].innerHTML = dat[1];
    console.log("Connected:", dat[0], ",Ready:", dat[1]);
})
s.on('UpdateGM', function (dat) {
    gm = dat;
    if (!init) s.emit('AskSize', null);
    if (init) illu();
})
s.on('UpdateUser', function (dat) {
    User = dat;
    colorNick = [];
    myColor = User[s.id].color;
    for(var k in User){
        colorNick[User[k].color] = User[k].nick;
    }
})
s.on('UpdateSize', function (dat) {
    size = dat;
    makeBoard();
    init = true;
})
s.on('GameStart', function () {
    round = 0; movement = [];
    movementUploader = setInterval(() => {
        if(movement != undefined && movement != 0){
            if(movement[0][0] <= 2)
                s.emit('UploadMovement', movement[0].slice(1)),movement[0][0]++;
            else movement[0][0]-=0.25;
        } 
        else s.emit('UploadMovement', []);
    }, 50);
})
s.on('ReceiveMovement', function(dat){
    if(movement != undefined && movement != 0){
        if(dat[0] == movement[1] && dat[1] == movement[2] && dat[2] == movement[3] && dat[3] == movement[4])
            movement[0][0] ++;
    }
})
s.on('UpdateRound', function (dat) {
    round = dat; 
})
s.on('ClearMovement', function () {
    while (movement.length) {
        if (gm[movement[0][1]][movement[0][2]].color != myColor || gm[movement[0][1]][movement[0][2]].amount <= 1) movement = movement.slice(1);
        else break;
    }
})
s.on('DeleteMovement', function () {
    if (movement.length && movement[0][0])
        movement = movement.slice(1);
    while (movement.length) {
        if (gm[movement[0][1]][movement[0][2]].color != myColor || gm[movement[0][1]][movement[0][2]].amount <= 1) movement = movement.slice(1);
        else break;
    }
})
s.on('WinAnction', function (dat) {
    Swal.fire("欢呼", dat + "赢了", "success");
    isThirdPerson = false;
    if ($.cookie("third") != "1")
        $("#ready")[0].innerHTML = "准备", $("#ready").css('visibility', 'unset');
})
s.on('isGameStart', function (dat) {
    if (dat) {
        $("#ready").css('visibility', 'hidden');
        isThirdPerson = true;
    }
})
s.on('ThirdPersonModeStatus', function (dat) {
    if (dat) Swal.fire("进入旁观模式成功", "", 'success');
    else Swal.fire("进入旁观模式失败", "", 'error');
});
s.on('ForceThird', function () {
    $.cookie("third", "1", { expires: 1 });
    location.reload();
});
s.on('die', function () {
    Swal.fire("您死了!", "", 'warning');
    setTimeout(() => {
        // $.cookie("third", "1", { expires: 1 });
        location.reload();
    }, 500);
});
s.on('swal', function(dat, func){
    Swal.fire(dat);
    if(func != undefined)
        eval(func);
})
if ($.cookie("third") == "0") {
    $("#third")[0].innerHTML = "进入旁观";
} else {
    $("#third")[0].innerHTML = "退出旁观";
    $("#ready").css('visibility', 'hidden');
    s.emit('ThirdPersonMode');
}
$("#ready")[0].onclick = function () {
    if (this.innerHTML == "准备") {
        voteStart(1);
        this.innerHTML = "取消准备";
    } else {
        voteStart(0);
        this.innerHTML = "准备";
    }
}