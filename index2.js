const net = require('net');
const express = require('express');
const app = express();
var server = net.createServer();

server.listen(58900, () => {
    console.log('opened server on %j', server.address().port);
});

var socket = server.on("connection", (socket) => {
    console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    socket.setKeepAlive(true); // to keep the status connected with crestron
    // var res = socket.write('test from Anees');
    // console.log(res);
    return socket;
});


app.get('/api/light_scene_command/:id', (req, res) => {
    
    res.send(apiResponse('command is sent'));
})