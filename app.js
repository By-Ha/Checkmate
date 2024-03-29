var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

process.on('uncaughtException',function(err){console.error(err);}) //监听未捕获的异常

process.on('unhandledRejection',function(err,promise){console.error(err, promise);})


logger.token('realip', function (req, res) {
    return req.headers['x-real-ip'];
});

logger.token('localDate', function (req) {
    let date = new Date();
    return date.toLocaleString()
})

logger.format('kana', '[:localDate] :realip :status :method :url  ');

var bodyparser = require('body-parser');
var session = require('express-session');
var db = require('./database/database');
var game = require('./game/core');
var message = require('./message/message');
var config = require('./config');

var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var registerRouter = require('./routes/register');
var postRouter = require('./routes/post');
var apiRouter = require('./routes/api');
var checkmateRouter = require('./routes/checkmate');
var adminRouter = require('./routes/admin');
var superadminRouter = require('./routes/superadmin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('kana'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.json()); // 使用bodyparder中间件，
app.use(bodyparser.urlencoded({ extended: true }));

/* cookie */

const sessionOptions = {
    key: 'client_session',
    secret: "wobuyaonijuedewoyaowojuedezhegemimabuxinga",
    store: db.sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: ('name', 'value', {
        maxAge: 24 * 60 * 60 * 1000,
        secure: false,
        name: "KanaSession",
        resave: false
    })
};

app.use(session(sessionOptions));

var server = require('http').Server(app);
var io = require('socket.io')(server, {
    path: '/ws/checkmate'
});

var messageio = require('socket.io')(server, {
    path: '/ws/message'
});
message.Run(messageio);

var gkio = require('socket.io')(server, {
    path: '/ws/gk'
});
global.gkio = gkio;
gkio.on('connection', (s)=>{
    s.on('gk', () => {
        db.runSQL('SELECT COUNT(id) FROM gk', [], (err, dat)=>{
            s.emit('gk', dat[0]['COUNT(id)'])
        })
    })
})

/* socket.io */

io.use(function (socket, next) {
    cookieParser("wobuyaonijuedewoyaowojuedezhegemimabuxinga")(socket.handshake, socket.request.res, next);
});

server.listen(config.websocket_port, function () {
    console.log('Websocket listening on *:' + config.websocket_port);
});


/* routers */

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/register', registerRouter);
app.use('/post', postRouter);
app.use('/api', apiRouter);
app.use('/checkmate', checkmateRouter);
app.use('/admin', adminRouter);
app.use('/superadmin', superadminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


game.Run(io);

module.exports = app;
