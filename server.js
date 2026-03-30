const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    console.log('Node connected:', socket.id);

    // 1. Initial Authentication
    socket.on('authenticate', (data) => {
        users = users.filter(u => u.id !== socket.id); 
        users.push({ 
            id: socket.id, 
            peerId: data.peerId, 
            status: 'idle', 
            partner: null,
            mode: null 
        });
        io.emit('update-count', users.length);
    });

    // 2. Matching — designates one side as offerer to prevent signaling collision
    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;

        user.status = 'searching';
        user.mode = data.mode; // 'text', 'voice', or 'video'

        let partner = users.find(p => 
            p.id !== socket.id && 
            p.status === 'searching' && 
            p.mode === user.mode
        );

        if (partner) {
            user.status = partner.status = 'chatting';
            user.partner = partner.id;
            partner.partner = user.id;

            // One side is offerer, one is answerer — prevents double-offer collision
            io.to(user.id).emit('match-found', { 
                peerId: partner.peerId, 
                mode: user.mode,
                isOfferer: true
            });
            io.to(partner.id).emit('match-found', { 
                peerId: user.peerId, 
                mode: partner.mode,
                isOfferer: false
            });
        }
    });

    // 3. Text Messaging
    socket.on('send-msg', (msg) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) {
            io.to(u.partner).emit('receive-msg', msg);
        }
    });

    // 4. WebRTC Signaling
    socket.on('webrtc-signal', (data) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) {
            io.to(u.partner).emit('webrtc-signal', data);
        }
    });

    // 5. Video Call Ring (text and voice modes only)
    socket.on('video-ring', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('video-ring');
    });

    socket.on('video-accepted', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) {
            // Caller (who rang) becomes offerer, acceptor answers
            io.to(u.partner).emit('video-call-start', { isOfferer: true });
            io.to(u.id).emit('video-call-start', { isOfferer: false });
        }
    });

    socket.on('video-declined', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('video-declined');
    });

    // 6. Disconnect / Skip
    const handleDisconnect = () => {
        const idx = users.findIndex(u => u.id === socket.id);
        if (idx !== -1) {
            const user = users[idx];
            if (user.partner) {
                io.to(user.partner).emit('stranger-left');
                const partner = users.find(p => p.id === user.partner);
                if (partner) { 
                    partner.status = 'idle'; 
                    partner.partner = null; 
                }
            }
            users.splice(idx, 1);
            io.emit('update-count', users.length);
        }
    };

    socket.on('leave-chat', handleDisconnect);
    socket.on('disconnect', handleDisconnect);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`GUPPY Mesh active on port ${PORT}`);
});
