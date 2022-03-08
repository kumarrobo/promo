var express = require('express');
var http = require('http');

var app = express();
var server = http.createServer(app);

var io = require('socket.io')(server);
var path = require('path');


io.on("connection", function (socket) {
	socket.on('data_masuk', (data) => {
        io.emit('data_masuk', data)
	})
	
	socket.on('logout', (data) => {
        io.emit('logout', data)
	})
	
	socket.on('reset', (data) => {
        io.emit('reset', data)
	})
	
    socket.on('data_masuk', (data) => {
        socket.broadcast.emit("reload",data);
	})

    socket.on('buka', () => {
        socket.broadcast.emit("buka");
	})    
    socket.on('ambil', () => {
        socket.broadcast.emit("ambil");
	})
    socket.on('bukat', () => {
        socket.broadcast.emit("bukat");
	})
    socket.on('hapus', () => {
        socket.broadcast.emit("hapus");
	})
    socket.on('lock', () => {
        socket.broadcast.emit("lock");
	})
    socket.on('teredit', () => {
        socket.broadcast.emit("teredit");
	})
    socket.on('lunas', () => {
        socket.broadcast.emit("lunas");
	})
    socket.on('terbuka', () => {
        socket.broadcast.emit("terbuka");
	})
    socket.on('gagal', (data) => {
        socket.broadcast.emit("gagal",data);
	})
    
    socket.on('global', (data) => {
        socket.broadcast.emit("global",data);
	})
});

server.listen(8080, () => {
  console.log('Server listening on :8080');
});