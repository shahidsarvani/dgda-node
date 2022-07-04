const net = require('net');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const mysql = require('mysql');
var server = net.createServer();

// app.use(bodyParser.json());

// const conn = mysql.createConnection({
//     host: 'localhost',
//     user: 'root', /* MySQL User */
//     password: '', /* MySQL Password */
//     database: 'dgda' /* MySQL Database */
//     // host: '18.170.155.197',
//     // user: 'admin_dgda_cms_user', /* MySQL User */
//     // password: '3S~9f7a7b', /* MySQL Password */
//     // database: 'admin_dgda_cms_db' /* MySQL Database */
// });

// conn.connect((err) => {
//     if (err) throw err;
//     console.log('Mysql Connected with App...');
// });

server.listen(58900, () => {
    console.log('opened server on %j', server.address().port);
});
// const client = net.createConnection({ port: 58900 }, () => {
//     // 'connect' listener.
//     console.log('connected to server!');
//     console.log("Client connection details - ", client.remoteAddress + ":" + client.remotePort);
//     var res = client.write('world!\r\n');
//     console.log(res)
// });

// var socket = server.on("connection", (socket) => {
//     console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
//     socket.setKeepAlive(true); // to keep the status connected with crestron
//     var res = socket.write('test from Anees');
//     console.log(res);
// });

app.get('/api/light_scene_command/:id', (req, res) => {

    let sqlQuery = "SELECT name FROM `commands` INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " + req.params.id;

    let query = conn.query(sqlQuery, (err, result) => {
        if (err) {
            res.send(apiResponseBad(null));
        }
    
        server.on("connection", (socket) => {
            console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
            socket.setKeepAlive(true); // to keep the status connected with crestron
            var res = socket.write(result.name);
            console.log(res);
            res.send(apiResponse('command is sent'));
        });
    });
    // return res.send(req.params.id)
})

// app.post('/api/zone/:id/play_scene', (req, res) => {
//     // socket.on('video', (msg) => {
//     //     io.emit('video', msg);
//     // });
//     res.send(apiResponse('command is sent'));
// })
