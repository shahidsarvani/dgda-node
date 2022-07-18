const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var VLC = require('vlc-simple-player')

var socket = io({ query: 'room_id=wsw' });


socket.on('change_video_wsw', function (msg) {
    console.log(msg);
    var player = new VLC('./PROJ_overlap june 15_289df2233b0d250661c30ece214ef5c0.mp4')
})