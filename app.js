var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
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

/**
 * @author NTS
 * Thêm mới
 */
app.use(function(req, res, next){
  res.io = io;
  next();
});


app.use('/', indexRouter);
app.use('/users', usersRouter);


/**
 * ===================================== SOCKET IO ================================================
 */

 var socMan = {};

io.sockets.on('connection', function(socket){

  console.log('This is Host?', isHost(socket));

 

  // Recieve join request form client
  socket.on('join', function(data){
    var isStreamer;
    if(data.room !== undefined && data.room !== null && data.room !== ""){
      
      //Check wherever host in room
      if(isHost(socket)) {
        if(isOtherHostInRoom(data.room)){
          isStreamer = false;
          socket.emit('redirectCmd',{toUrl:'http://localhost:3000/users/view'});
          console.log('Finish emit redirect cmd');
          return;
        } else {
          console.log('assign TRUE to isStreamer');
          isStreamer = true;

          // socket.to(data.room).emit('connectToHost',{hostSocketId:socket.id});
        }
      } else {
        isStreamer = false;
      }
      console.log('Testing isStreamer:', isStreamer)

      

      socket.join(data.room, function(){

        if(socMan[data.room] === null || socMan[data.room] === undefined) socMan[data.room] ={}

        socMan[data.room][socket.id] = {
          socketID: socket.id,
          isStreamer: isStreamer
        }

        socket.emit('joined',socMan[data.room]);

        //Require all member in room to re-collect room info
        socket.to(data.room).emit('receiveRoomInfo', socMan[data.room]);

      });

    }

    socket.on('hostIsReady', function(data){
      socket.to(data.room).emit('connectToHost',{hostSocketId:socket.id, stages:data.stages});
    });

    socket.on('requestMediaStage', function(data){
      socket.to(data.hostSocketId).emit('requestMediaStage',{fromSocket: socket.id})
    });

    socket.on('sendMediaStage', function(data){

      socket.to(data.toSocket).emit("receivedMediaStage",{fromSocket:socket.id,stages:data.stages})
    })

    socket.on('getRoomInfo', function(data){
      //Require all member in room to re-collect room info
      socket.to(data.room).emit('receiveRoomInfo', socMan[data.room]);
    })

    //Frowarding message
    socket.on('sendMsg', function(data){
      var receiveSocket = data.toSocket;

      data = {
        fromSocket: socket.id,
        content: data.content,
        pcInfo: data.pcInfo
      }

      socket.to(receiveSocket).emit('receiveMsg', data);
    })

    // socket.on('RequestNewSlideFrame', function(data){
    //   socket.to(data.toSocket).emit('SendNewFrame');
    // });

    /**
     * Handle disconnect event
     */
    socket.on('disconnect', function(reason){
      console.log("Socket disconnected! ->", socket.id);
      var counter = 0;
      console.log('socMan:', socMan);
      for(id in socMan){
        console.log("Looping:",counter++, id);

        var pos = 0;
        for(xy in socMan[id]){
          pos++;
          if(socMan[id][xy].socketID == socket.id) {
            console.log('Found disconnect at room:', id);

            console.log('socMan before:', socMan)
            console.log('Type of socMan:', typeof(socMan[id]))
            delete socMan[id][xy]

            console.log('socMan after:', socMan);

            //Require all member in room to re-collect room info
            socket.to(id).emit('handleDisconectSocket',{disconnectedSocket:xy});
          }
        }
      }
    })
  })
});

function isRoomEmpty(room){
  for(id in socMan[room]){
    return false;
  }
  return true;
}

function isOtherHostInRoom(room){
  for(id in socMan[room]){
    if(socMan[room][id].isStreamer) {
      console.log('Found Host in Room:', room)
      return true;
    }
  }
  console.log('NOT Found Host in Room:', room)
  return false
}

function isHost(socket){
  var requestURL = socket.request.headers.referer;
  var str = requestURL.split('/');

  if(str[str.length-1] == 'live'){
    return true
  }
  return false;
}



/**
 * ======================================================================================================
 */

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = {app: app, server: server};
