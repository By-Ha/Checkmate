var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var bodyparser = require('body-parser');
var session = require('express-session');
var db = require('./database/database');
var game = require('./game/core');

var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var registerRouter = require('./routes/register');
var postRouter = require('./routes/post');
var apiRouter = require('./routes/api');
var checkmateRouter = require('./routes/checkmate');

var app = express();

app.get('/WS', function (req, res) { res.send('<h1>WS Server</h1>'); });
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
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

/* routers */

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/register', registerRouter);
app.use('/post', postRouter);
app.use('/api', apiRouter);
app.use('/checkmate', checkmateRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  console.log(req.ip);
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

/* socket.io */

server.listen(3002, function () {
  console.log('listening on *:3002');
});

io.use(function (socket, next) {
  session(sessionOptions)(socket.handshake, {}, next);
});

game.Run(io);

module.exports = app;
