const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 6000;

io.on('connection', (socket) => {
    console.log('Notification server connected');

    socket.on('pdfGenerated', (data) => {
        console.log('PDF Generation Status:', data.status, 'for vehicle ID:', data.vehicleId);
    });

    socket.on('disconnect', () => {
        console.log('Notification server disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Notification server is running on http://localhost:${PORT}`);
});
