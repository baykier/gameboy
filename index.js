// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var config = require('./config.js');
var port = process.env.PORT || 3000;
var request = require('request');
var qrcode = require('qrcode');
var session = require('express-session');
var cookie = require('cookie-parser');
var openid = [];

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookie('gameboy'));
app.use(session({
  secret: 'gameboy',//与cookieParser中的一致
  resave: true,
  saveUninitialized:true,
  cookie:{
    path: '/', 
    httpOnly: true, 
    secure: false, 
    maxAge: null
  }
 }));
//获取openid
app.get('/code', function (req, res) {
  //查询openid
  var code = req.param('code');
  console.log(code);
  request({
    url: 'https://api.weixin.qq.com/sns/jscode2session',
    qs: {
      appid: config.appId,
      secret: config.appSec,
      js_code: code,
      grant_type: 'authorization_code'
    }
  },function(err,resonse,body){
    var body = JSON.parse(body);    
    openid[body.openid] = body;
    res.send({ code: 0, msg: 'ok' ,'openid': body.openid});
  })
  console.log(openid);
});
//二维码 扫码后用sessionID代表进入哪个房间
app.get('/qrcode', function (req, res) {
  var room = req.sessionID;
  var id = req.param('id'); 
  console.log(room); 
  qrcode.toDataURL(room, function(err, url) {    
      res.send({'url':url,'room':room})
    }
  )    
})


// 游戏
var numUsers = 0;
io.on('connection', (socket) => {
addedUser = false;
  // 新用户扫码
  socket.on('user join', (data) => {
    var room = data.result;
    console.log(data);
    console.log('微信用户' + data.openid + '加入房间' + room)
    socket.openid = data.openid;
    socket.room = data.room;
    socket.join(room);
  });
  //游戏页面
  socket.on('game start',(data) => {
    socket.join(data)
  });

  // 游戏按键按下
  socket.on('keydown', (username) => {   

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;

    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.to(socket.room).emit('game keydown', {
      username: socket.username,
      numUsers: numUsers
    });
  });
 //游戏按键起来

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
