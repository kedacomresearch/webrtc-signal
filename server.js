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

let roomManager = Object.create(null);

io.of(`${channel}.webrtc`).on('connection', function(socket) {
    if(!socket.handshake.query.room) {
        socket.emit('error', 'handshake query param "room" is supposed to be provided');
    } else {
        let roomId = socket.handshake.query.room;

        if(roomManager[`${roomId}`] && roomManager[`${roomId}`].numberCount && roomManager[`${roomId}`].numberCount === 2) {
            socket.emit('disconnect', 'room members is enough, not allowed to enter anymore!');
            socket.disconnect(true);
            return;
        }

        socket.join(`${roomId}`, (err) => {
            if(err) {
                throw err;
            }
            socket.roomId = roomId;
            console.info(`Join room ${socket.roomId}`);
            if(!roomManager[`${socket.roomId}`]) {
                roomManager[`${socket.roomId}`] = {
                    numberCount: 1
                };
            } else {
                roomManager[`${socket.roomId}`].numberCount++;
            }
            console.info('numberCount： ' + roomManager[`${socket.roomId}`].numberCount);

            if(roomManager[`${socket.roomId}`].numberCount === 2) {
                console.info('connected');
                io.of(`${channel}.webrtc`).to(`${socket.roomId}`).emit('connected');
            }
        });

        socket.on('sdp', function (data) {
            //send it to other clients in this room
            console.dir(data);
            socket.broadcast.to(`${socket.roomId}`).emit('sdp', data);
        });

        socket.on('disconnect', (reason) => {
            console.log(reason);
            socket.leave(`${socket.roomId}`, (err) => {
                if(err)
                    throw err;
                roomManager[`${socket.roomId}`].numberCount--;
                io.of(`${channel}.webrtc`).to(`${socket.roomId}`).clients( (err, clients) => {
                    if(err)
                        throw err;
                    console.log(clients);
                    if(clients.length > 0) {
                        //send it to other clients in this room
                        socket.broadcast.to(`${socket.roomId}`).emit('leave', reason);
                    }
                });

            });
        });
    }

});