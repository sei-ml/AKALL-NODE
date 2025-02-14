/**
 * src/sockets/index.js
 *
 * Initialize Socket.io on a given server and define basic events.
 */

const { Server } = require('socket.io');

function initSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // or restrict to specific domain
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Example event from client
    socket.on('helloServer', (data) => {
      console.log('Client says:', data);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSockets;
