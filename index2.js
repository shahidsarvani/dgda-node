const net = require('net');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const mysql = require('mysql');
var server = net.createServer();
// const http = require('http');
// const server = http.createServer(app);
// var socket = new net.Socket({
//     writeable: true,
// });
var gSocket;

// app.use(bodyParser.json());

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root', /* MySQL User */
    password: '', /* MySQL Password */
    database: 'dgda' /* MySQL Database */
    // host: '18.170.155.197',
    // user: 'admin_dgda_cms_user', /* MySQL User */
    // password: '3S~9f7a7b', /* MySQL Password */
    // database: 'admin_dgda_cms_db' /* MySQL Database */
});

conn.connect((err) => {
    if (err) throw err;
    console.log('Mysql Connected with App...');
});

server.listen(58900, () => {
    console.log('opened server on %j:%k',server.address().address, server.address().port);
});

// socket.connect({
//     port: 58900,
// }, (error) => {
//     if (error) throw error;
//     console.log('Net socket connected...');
//     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
// })

// const client = net.createConnection({ port: 58900 }, () => {
//     // 'connect' listener.
//     console.log('connected to server!');
//     console.log("Client connection details - ", client.remoteAddress + ":" + client.remotePort);
//     var res = client.write('world!\r\n');
//     console.log(res)
// });

var socket = server.on("connection", (socket) => {
    console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    gSocket = socket;
    gSocket.setKeepAlive(true); // to keep the status connected with crestron
    var res = gSocket.write('test from Anees');
    console.log(res);
    var res2 = gSocket.write('test 2 from Anees');
    console.log(res2);
});

setTimeout(function() {
    console.log(gSocket.remoteAddress + ":" + gSocket.remotePort);
    var res2 = gSocket.write('test 2 from Anees');
    console.log(res2);
}, 30000)

app.get('/api/light_scene_command/:id', (req, res) => {

    let sqlQuery = "SELECT name FROM `commands` INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " + req.params.id;

    let query = conn.query(sqlQuery, (err, result) => {
        if (err) {
            res.send(apiResponseBad(null));
        }

        // server.on("connection", (socket) => {
        //     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
        //     socket.setKeepAlive(true); // to keep the status connected with crestron
            var res1 = gSocket.write(result.name);
            console.log(res1);
            res.send(apiResponse('command is sent'));
        // });
    });
    // return res.send(req.params.id)
})


// server.on("connection", (socket) => {
//     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
//     socket.setKeepAlive(true); // to keep the status connected with crestron
//     app.get('/api/light_scene_command/:id', (req, res) => {

//         let sqlQuery = "SELECT name FROM `commands` INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " + req.params.id;

//         let query = conn.query(sqlQuery, (err, result) => {
//             if (err) {
//                 res.send(apiResponseBad(null));
//             }
//             var res1 = socket.write(result.name);
//             console.log(res1);
//             res.send(apiResponse('command is sent'));
//         });
//     });
//     // return res.send(req.params.id)
// })

app.get('/api/model/up', (req, res) => {
    // server.on("connection", (socket) => {
    //     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    //     socket.setKeepAlive(true); // to keep the status connected with crestron
    //     var result = socket.write('GETSTAUS');
    //     console.log(res);
    //     if(result == 0) {
    //         var result2 = socket.write('MODELUP');
    //         console.log(result2);
    //     }
    //     res.send(apiResponse('command is sent'));
    // });
    res.send(apiResponse('Model up command is sent'));
})

app.get('/api/model/down', (req, res) => {
    // server.on("connection", (socket) => {
    //     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    //     socket.setKeepAlive(true); // to keep the status connected with crestron
    //     var result = socket.write('GETSTAUS');
    //     console.log(res);
    //     if(result == 0) {
    //         var result2 = socket.write('MODELDOWN');
    //         console.log(result2);
    //     }
    //     res.send(apiResponse('command is sent'));
    // });
    res.send(apiResponse('Model down command is sent'));
})
// app.post('/api/zone/:id/play_scene', (req, res) => {
//     // socket.on('video', (msg) => {
//     //     io.emit('video', msg);
//     // });
//     res.send(apiResponse('command is sent'));
// })
