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
  console.log('获取二维码')
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
    console.log('微信用户扫描')
    console.log(data);
    console.log('微信用户' + data.openid + '加入房间' + room)
    socket.openid = data.openid;
    socket.room = room;
    socket.join(room);
    socket.to(room).emit('scan', data);
  });
  //游戏页面
  socket.on('game start',(data) => {
    console.log('显示游戏主页')
    console.log(data);
    socket.join(data)
  });

  // 游戏按键
  socket.on('user control', (data) => {
    console.log('游戏按键')
    console.log(data)
    console.log(socket.room);
    socket.to(socket.room).emit('play',data);
  }); 
  // 断开链接
  socket.on('disconnect', () => {
      console.log(socket.room + 'left');
      socket.to(socket.room).emit('left','222' );
  });
});
