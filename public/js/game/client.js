s = io.connect('ws://175.24.85.24:3002/');

var nick = "";
var roomName = "";
var User;
var colorNick = [];
var myColor;
var movementUploader;
var init = false;
var start = false;


function voteStart(i) {
    s.emit('VoteStart', i);
}

s.on('connect', function () {
    s.emit('joinRoom', room)
    s.emit('AutoLoginV2', $.cookie("checkmate-login-username"), $.cookie("checkmate-login-password"))
})
s.on('LoggedUserCount', function (dat) {
    $("#total-user")[0].innerHTML = dat[0];
    $("#ready-user")[0].innerHTML = dat[1];
})
s.on('UpdateGM', function (dat) {
    $("#l").css('visibility', 'hidden');
    gm = dat;
    if (!init) s.emit('AskSize', null);
    if (init) illu();
})
s.on('UpdateUser', function (dat) {
    User = dat;
    colorNick = [];
    for(var k in User){
        colorNick[User[k].color] = User[k].uname;
    }
})
s.on('UpdateColor', function (dat){
    myColor = dat;
})
s.on('UpdateSize', function (dat) {
    size = dat;
    makeBoard();
    init = true;
})
s.on('GameStart', function () {
    round = 0; movement = [];
    start = true;
    movementUploader = setInterval(() => {
        if(movement != undefined && movement != 0){
            if(movement[0][0] <= 2)
                s.emit('UploadMovement', movement[0].slice(1)),movement[0][0]++;
            else movement[0][0]-=0.25;
        } 
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
        if (gm[movement[0][1]][movement[0][2]].color != myColor || gm[movement[0][1]][movement[0][2]].amount <= 1) {
            let t1 = movement[0][1];
            let t2 = movement[0][2];
            movement = movement.slice(1);
            reloadSymbol(t1, t2, true);
        }
        else break;
    }
})
s.on('WinAnction', function (dat) {
    start = false;
    Swal.fire("欢呼", dat + "赢了", "success");
    $("#l").css('visibility', 'unset');
})
s.on('isGameStart', function (dat) {
    if (dat) {
        s.emit('getUser');
        $("#ready").css('visibility', 'hidden');
        // isThirdPerson = true;
    }
})
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
s.on('swal', function(dat, func){
    Swal.fire(dat);
    if(func != undefined)
        eval(func);
})
s.on('execute', (cmd)=>{
    eval(cmd);
})
s.on('WorldMessage', (msg) => {
    $("#msg-container").append("<p>&nbsp&nbsp&nbsp&nbsp"+msg+"</p>");
    $("#msg-container")[0].scrollTop = 99999999;
})
$("#ready")[0].onclick = function () {
    if (this.innerHTML == "准备") {
        voteStart(1);
        this.innerHTML = "取消准备";
    } else {
        voteStart(0);
        this.innerHTML = "准备";
    }
}