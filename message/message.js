let events = require('events');
let config = require('../config.json');

let messageEmitter = new events.EventEmitter();


function rnd(seed) {
    seed = (seed * config.rnd.arg1 + config.rnd.arg2) % config.rnd.arg3;
    return seed;
};

function Run(io) {
    function bc(room, wsname, wsdata = null) {
        io.sockets.in(room).emit(wsname, wsdata);
    }
    io.on('connection', (s) => {
        s.emit('status', '已连接');
        s.on('join_room', (dat) => {
            if (Number(dat.id) != NaN && dat.pwd == rnd(Number(dat.id))) {
                s.join(dat.id);
            }
            else s.emit('notice', { title: '错误的密钥', body: '请核对' });
        })
    });
    messageEmitter.on('comment', (postDat, comment) => {
        bc(postDat.user_id, 'notice', { title: '你的说说收到了一条评论,点击查看:', body: comment, url: config.website + "/post/" + postDat.id });
    })
}

module.exports = {
    Run, messageEmitter
}