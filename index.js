const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const child_process = require('child_process');
const child_script_path = 'tcp.js';

app.use(bodyParser.json());
app.use('/media/images', express.static('media/images'));
app.use('/media/video', express.static('media/video'));
app.use(cors());
app.use(
    express.urlencoded({
        extended: true,
    })
);

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


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/pages/index.html');
});

app.get('/video', (req, res) => {
    res.sendFile(__dirname + '/pages/video.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('video', (msg) => {
        io.emit('video', msg);
    });
});

app.get('/api/rooms', (req, res) => {
    let sqlQuery = "SELECT id, name, name_ar, image, image_ar, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            result.image = 'http://localhost:3001/media/images/' + result.image
            // result.image_ar = /* 'http://localhost:3001/media/images/' + */ result.image_ar
        })
        res.send(apiResponse(results));
    });
});

app.get('/api/rooms/ar', (req, res) => {
    let sqlQuery = "SELECT id, name_ar, image_ar, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            // result.image = /* 'http://localhost:3001/media/images/' + */ result.image
            result.image_ar = 'http://localhost:3001/media/images/' + result.image_ar
        })
        res.send(apiResponse(results));
    });
});

app.get('/api/room/:id/phases_with_zones', (req, res) => {
    // res.send(req.params.id);
    try {
        let sqlQuery = "SELECT id, name, image FROM phases WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, phases) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            for (let i = 0; i < phases.length; i++) {
                phases[i].image = 'http://localhost:3001/media/images/' + phases[i].image
                let sqlQuery = "SELECT id, name FROM zones WHERE phase_id = " + phases[i].id;
                conn.query(sqlQuery, (err, zones) => {
                    if (err) {
                        res.send(apiResponseBad(null));
                    };
                    phases[i].zones = zones
                })
            }
            setTimeout(() => {
                res.send(apiResponse(phases));
            }, 100)
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/phases_with_zones/ar', (req, res) => {
    // res.send(req.params.id);
    try {
        let sqlQuery = "SELECT id, name_ar, image_ar FROM phases WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, phases) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            for (let i = 0; i < phases.length; i++) {
                phases[i].image_ar = 'http://localhost:3001/media/images/' + phases[i].image_ar
                let sqlQuery = "SELECT id, name_ar FROM zones WHERE phase_id = " + phases[i].id;
                conn.query(sqlQuery, (err, zones) => {
                    if (err) {
                        res.send(apiResponseBad(null));
                    };
                    phases[i].zones = zones
                })
            }
            setTimeout(() => {
                res.send(apiResponse(phases));
            }, 100)
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/light_scenes', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name, image_en FROM light_scenes WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                res.send(apiResponseBad(null));
            }
            scenes.map(function (result) {
                result.image = 'http://localhost:3001/media/images/' + result.image_en
            })
            res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/light_scenes/ar', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name_ar, image_ar FROM light_scenes WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            scenes.map(function (result) {
                result.image = 'http://localhost:3001/media/images/' + result.image_ar
            })
            res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/zones', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name FROM zones WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/zones/ar', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name_ar FROM zones WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        res.send(apiResponseBad(null));
    }
});

app.get('/api/model/up', (req, res) => {
    res.send(apiResponse('Model up command is sent'));
})

app.get('/api/model/down', (req, res) => {
    res.send(apiResponse('Model down command is sent'));
})

app.get('/api/video/play', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'play');
    // });
    res.send(apiResponse('Video play command is sent'));
})

app.get('/api/video/pause', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'pause');
    // });
    res.send(apiResponse('Video pause command is sent'));
})

app.get('/api/video/stop', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'stop');
    // });
    res.send(apiResponse('Video stop command is sent'));
})

app.get('/api/volume/increase', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'up');
    // });
    res.send(apiResponse('Volume increase command is sent'));
})

app.get('/api/volume/decrease', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'down');
    // });
    res.send(apiResponse('Volume decrease command is sent'));
})

app.get('/api/volume/mute', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'mute');
    // });
    res.send(apiResponse('Volume mute command is sent'));
})

app.get('/api/light_scene_command/:id', (req, res) => {
    let sqlQuery = "SELECT name FROM `commands` INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " + req.params.id;

    // res.send(apiResponse(sqlQuery));
    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        } else {
            var child_argv = results.map((result) => {
                return result.name
            })
            // res.send(apiResponse(child_argv));
            let child = child_process.fork(child_script_path, child_argv)
            res.send(apiResponse('command is sent'));
        }
    });
})

// app.post('/api/room/:id/play_scene', (req, res) => {
//     // socket.on('video', (msg) => {
//     //     io.emit('video', msg);
//     // });
//     res.send(apiResponse('command is sent'));
// })

app.post('/api/zone/:id/play_scene', (req, res) => {
    // socket.on('video', (msg) => {
    //     io.emit('video', msg);
    // });
    var lang = req.body.lang;
    let sqlQuery = "SELECT name FROM `media` WHERE zone_id = " + req.params.id + " AND lang = '" + lang + "'";

    // return res.send(apiResponse(sqlQuery));
    let query = conn.query(sqlQuery, (err, result) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        // return res.send(apiResponse(result[0].name));
        io.emit('change_video', result[0].name);
        res.send(apiResponse('command is sent'));
    });

})

app.get('/api/test', (req, res) => {
    const child_argv = [
        'test',
        'test2'
    ]
    // const child_execArgv = [
    //   '--use-strict'
    // ]

    let child = child_process.fork(child_script_path, child_argv)
    res.send(apiResponseBad(null));
})

function apiResponse(results) {
    // return JSON.stringify({ "status": 200, "error": null, "response": results });
    return { "status": 200, "error": null, "response": results };
}

function apiResponseBad(results) {
    // return JSON.stringify({ "status": 200, "error": null, "response": results });
    return { "status": 500, "error": true, "response": results };
}

server.listen(3001, () => {
    console.log('Server started on port 3001...');
});