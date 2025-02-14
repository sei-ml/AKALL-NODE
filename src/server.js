/**
 * src/server.js
 *
 * Main entry point to start the Express app, Socket.io,
 * MongoDB connection, and file watcher.
 */

require('dotenv').config(); // ENV variables .env
const http = require('http');
const express = require('express');
const path = require('path');
const connectDB = require('./db/connect');
const nd3Routes = require('./routes/nd3Routes');
const initSockets = require('./sockets');
const fileWatcherService = require('./services/fileWatcherService');
const { PORT, MONGO_URI } = require('./config'); 

const app = express();

// Basic middleware
app.use(express.json());

app.use(express.static('public'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/watch', express.static(path.join(__dirname, '..', 'watch')));

// Routes
app.use('/api/nd3', nd3Routes);

// Create HTTP server & attach Socket.io
const server = http.createServer(app);
const io = initSockets(server);

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB(MONGO_URI);

    // Start listening
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Start the file watcher
    fileWatcherService.startWatcher(io); // Pass io if you want to emit socket events from the service
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();
