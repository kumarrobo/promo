const http = require("http");
const https = require("https");
const express = require('express');
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server);

io.on('connect', () => {
  socketClient.emit('npmStop');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});