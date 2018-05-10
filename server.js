/**
 * Created by Ganchao on 2018/3/26.
 */
const app = require('http').createServer();
const io = require('socket.io')(app);
const uuid = require('uuid/v1');

let channel = 'livestream';

let arguments = process.argv.splice(2);

if(arguments[0]) {
    channel = arguments[0].substr(arguments[0].indexOf('=') + 1);
}

app.listen(3030, () => {
    console.log('socket.io server listening on port 3030');
});

io.of(`${channel}.webrtc`).on('connection', function(socket) {
    if(!socket.handshake.query.room) {
        socket.emit('error', 'handshake query param "room" is supposed to be provided');
    } else {
        if(Object.keys(socket.rooms).length >= 2) {
            socket.send('room ${socket.handshake.query.room} has more than two visitors');
            socket.disconnect(true);
        } else {
            socket.join(`${socket.handshake.query.room}`, (err) => {
                if(err) {
                    throw err;
                }
                socket.roomId = socket.handshake.query.room;
                console.info(`Join room ${socket.roomId}`);
            });


            socket.on('sdp', function (data) {
                //send it to other clients in this room
                socket.broadcast.to(`${socket.roomId}`).emit('sdp', data);
            });

            socket.on('disconnect', (reason) => {
                console.log(reason);
                //send it to other clients in this room
                //socket.broadcast.to(`${socket.roomId}`).emit('disconnect', reason);
                socket.leave(`${socket.roomId}`);
            });
        }
    }

});