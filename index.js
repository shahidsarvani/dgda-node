const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const http = require('http');
const net = require('net');
const server = http.createServer(app);
const crestServer = net.createServer();
const { Server } = require("socket.io");
const io = new Server(server);
//const child_process = require('child_process');
//const child_script_path = 'tcp.js';
var crestSocket;

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

app.get('/video_p', (req, res) => {
    res.sendFile(__dirname + '/pages/video_p.html');
});


crestServer.on("connection", (socket) => {
    console.log("Crestron connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    crestSocket = socket;
    socket.setKeepAlive(true); // to keep the status connected with crestron
    crestSocket.setKeepAlive(true);
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('video', (msg) => {
        io.emit('video', msg);
    });

    socket.on('default_video', (msg) => {
        console.log(msg)
        console.log('show ended')
        let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay FROM `commands` INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN scenes ON scenes.id = command_scene.scene_id WHERE scenes.room_id = " + msg[1] + " AND scenes.is_default = 1 ORDER BY command_scene.sort_order ASC";
        // return res.send(lang);
        let sqlQuery2 = "SELECT media.name, media.is_projector FROM `media` INNER JOIN scenes ON scenes.id = media.scene_id WHERE scenes.room_id = " + msg[1] + " AND scenes.is_default = 1 AND media.lang = " + msg[2];
        let query = conn.query(sqlQuery, (err, results) => {
            if (err) {
                console.log(err)
                // res.send(apiResponseBad(null));
            } else {
                var child_argv = results.map((result) => {
                    return result.name
                })
                // res.send(apiResponse(child_argv));
                //let child = child_process.fork(child_script_path, child_argv)
                var r;
                child_argv.forEach(function (item) {
                    setTimeout(function () {
                        r = crestSocket.write(item);
                        console.log("Command sent to crestron with status: " + r);
                    }, results[index].delay)
                });
                // res.send(apiResponse('command is sent'));
            }
        });
        let query2 = conn.query(sqlQuery2, (err, results) => {
            if (err) {
                console.log(err)
                // res.send(apiResponseBad(null));
            };
            // return res.send(apiResponse(results));
            var p_video = '';
            for (var i = 0; i < results.length; i++) {
                if (results[i].is_projector) {
                    p_video = results[i].name
                    break;
                }
            }
            var w_video = '';
            for (var i = 0; i < results.length; i++) {
                if (!results[i].is_projector) {
                    w_video = results[i].name
                    break;
                }
            }
            // return res.send(apiResponse(w_video));
            io.emit('change_default_video', w_video);
            io.emit('change_default_video_p', p_video);
            // res.send(apiResponse('command is sent'));
            console.log('command is sent')
        });
    })
});

app.get('/api/rooms', (req, res) => {
    let sqlQuery = "SELECT id, name, name_ar, image, image_ar, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            result.image = 'http://192.168.10.4:3001/media/images/' + result.image
            // result.image_ar = /* 'http://192.168.10.4:3001/media/images/' + */ result.image_ar
        })
        res.send(apiResponse(results));
    });
});

app.get('/api/rooms/ar', (req, res) => {
    let sqlQuery = "SELECT id, name_ar as name, image_ar as image, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            // result.image = /* 'http://192.168.10.4:3001/media/images/' + */ result.image
            result.image = 'http://192.168.10.4:3001/media/images/' + result.image
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
                phases[i].image = 'http://192.168.10.4:3001/media/images/' + phases[i].image
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
        let sqlQuery = "SELECT id, name_ar as name, image_ar as image FROM phases WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, phases) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            for (let i = 0; i < phases.length; i++) {
                phases[i].image = 'http://192.168.10.4:3001/media/images/' + phases[i].image
                let sqlQuery = "SELECT id, name_ar as name FROM zones WHERE phase_id = " + phases[i].id;
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
                result.image = 'http://192.168.10.4:3001/media/images/' + result.image_en
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
        let sqlQuery = "SELECT id, name_ar as name, image_ar as image FROM light_scenes WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                res.send(apiResponseBad(null));
            };
            scenes.map(function (result) {
                result.image = 'http://192.168.10.4:3001/media/images/' + result.image
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
        let sqlQuery = "SELECT id, name_ar as name FROM zones WHERE room_id = " + req.params.id;

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
    // va
    // let child = child_process.fork(child_script_path, child_argv)
    // res.send(apiResponseBad(null));
    res.send(apiResponse('Model up command is sent'));
})

app.get('/api/model/down', (req, res) => {
    res.send(apiResponse('Model down command is sent'));
})

app.get('/api/room/:id/video/resume', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'play');
    io.emit('video_p', 'play');
    // });
    res.send(apiResponse('Video play command is sent'));
})

app.get('/api/room/:id/video/forward', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'forward');
    io.emit('video_p', 'forward');
    // });
    res.send(apiResponse('Video forward command is sent'));
})

app.get('/api/room/:id/video/back', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'back');
    io.emit('video_p', 'back');
    // });
    res.send(apiResponse('Video back command is sent'));
})

app.get('/api/room/:id/video/pause', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'pause');
    io.emit('video_p', 'pause');
    // });
    res.send(apiResponse('Video pause command is sent'));
})

app.post('/api/room/:id/video/stop', (req, res) => {
    var lang;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        lang = 'en';
    } else {
        lang = req.body.lang
    }
    var msg = [
        'stop',
        req.params.id,
        lang
    ]
    io.emit('video_stop', msg);
    io.emit('video', 'stop');
    res.send(apiResponse('Video stop command is sent'));
})

app.get('/api/volume/increase', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'up');
    io.emit('video_p', 'up');
    // });
    res.send(apiResponse('Volume increase command is sent'));
})

app.get('/api/volume/decrease', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'down');
    io.emit('video_p', 'down');
    // });
    res.send(apiResponse('Volume decrease command is sent'));
})

app.get('/api/volume/mute', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video', 'mute');
    io.emit('video_p', 'mute');
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
            //let child = child_process.fork(child_script_path, child_argv)
            var r;
            child_argv.forEach(function (item) {
                r = crestSocket.write(item);
                console.log("Command sent to crestron with status: " + r);
            });
            res.send(apiResponse('command is sent'));
        }
    });
})

app.post('/api/room/:id/play_scene', (req, res) => {
    let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay FROM `commands` INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN rooms ON rooms.scene_id = command_scene.scene_id WHERE rooms.id = " + req.params.id + " ORDER BY command_scene.sort_order ASC";
    var lang;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        lang = 'en';
    } else {
        lang = req.body.lang
    }
    // return res.send(sqlQuery);
    let sqlQuery2 = "SELECT media.name, media.is_projector FROM `media` INNER JOIN rooms ON rooms.scene_id = media.scene_id WHERE media.zone_id IS null AND media.room_id = " + req.params.id + " AND lang = '" + lang + "'";

    // return res.send(apiResponse(sqlQuery2));
    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        } else {
            // return res.send(apiResponseBad(timeOut));

            var child_argv = results.map((result) => {
                return result.name
            })
            // return res.send(apiResponse(child_argv));
            //let child = child_process.fork(child_script_path, child_argv)
            var r;
            child_argv.forEach(function (item, index) {
                setTimeout(function () {
                    r = crestSocket.write(item);
                    console.log("Command sent to crestron with status: " + r);
                }, results[index].delay)
            });
            // res.send(apiResponse('command is sent'));
        }
    });
    let query2 = conn.query(sqlQuery2, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        // return res.send(apiResponse(results));
        var p_video = '';
        for (var i = 0; i < results.length; i++) {
            if (results[i].is_projector) {
                p_video = results[i].name
                break;
            }
        }
        var w_video = '';
        for (var i = 0; i < results.length; i++) {
            if (!results[i].is_projector) {
                w_video = [
                    results[i].name,
                    req.params.id,
                    lang
                ]
                break;
            }
        }
        // return res.send(apiResponse(w_video));
        io.emit('change_video', w_video);
        io.emit('change_video_p', p_video);
        res.send(apiResponse('command is sent'));
    });
})

// app.post('/api/room/:id/restart_scene', (req, res) => {
//     let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay FROM `commands` INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN rooms ON rooms.scene_id = command_scene.scene_id WHERE rooms.id = " + req.params.id + " ORDER BY command_scene.sort_order ASC";
//     var lang;
//     if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
//         lang = 'en';
//     } else {
//         lang = req.body.lang
//     }
//     // return res.send(sqlQuery);
//     let sqlQuery2 = "SELECT media.name, media.is_projector FROM `media` INNER JOIN rooms ON rooms.scene_id = media.scene_id WHERE media.zone_id IS null AND media.room_id = " + req.params.id + " AND lang = '" + lang + "'";

//     // return res.send(apiResponse(sqlQuery2));
//     let query = conn.query(sqlQuery, (err, results) => {
//         if (err) {
//             res.send(apiResponseBad(null));
//         } else {
//             // return res.send(apiResponseBad(timeOut));

//             var child_argv = results.map((result) => {
//                 return result.name
//             })
//             // return res.send(apiResponse(child_argv));
//             //let child = child_process.fork(child_script_path, child_argv)
//             var r;
//             child_argv.forEach(function (item, index) {
//                 setTimeout(function () {
//                     r = crestSocket.write(item);
//                     console.log("Command sent to crestron with status: " + r);
//                 }, results[index].delay)
//             });
//             // res.send(apiResponse('command is sent'));
//         }
//     });
//     let query2 = conn.query(sqlQuery2, (err, results) => {
//         if (err) {
//             res.send(apiResponseBad(null));
//         };
//         // return res.send(apiResponse(results));
//         var p_video = '';
//         for (var i = 0; i < results.length; i++) {
//             if (results[i].is_projector) {
//                 p_video = results[i].name
//                 break;
//             }
//         }
//         var w_video = '';
//         for (var i = 0; i < results.length; i++) {
//             if (!results[i].is_projector) {
//                 w_video = [
//                     results[i].name,
//                     req.params.id,
//                     lang
//                 ]
//                 break;
//             }
//         }
//         // return res.send(apiResponse(w_video));
//         io.emit('change_video', w_video);
//         io.emit('change_video_p', p_video);
//         res.send(apiResponse('command is sent'));
//     });
// })

app.post('/api/zone/:id/play_scene', (req, res) => {
    var lang;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        lang = 'en';
    } else {
        lang = req.body.lang
    }
    let sqlQuery = "SELECT name FROM `media` WHERE zone_id = " + req.params.id + " AND lang = '" + lang + "'";
    let sqlQuery2 = "SELECT commands.name FROM `commands` INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN zones ON zones.scene_id = command_scene.scene_id WHERE zones.id = " + req.params.id + " ORDER BY command_scene.sort_order ASC";

    // return res.send(apiResponse(sqlQuery2));
    let query2 = conn.query(sqlQuery2, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        } else {
            var child_argv = results.map((result) => {
                return result.name
            })
            // res.send(apiResponse(child_argv));
            //let child = child_process.fork(child_script_path, child_argv)
            var r;
            child_argv.forEach(function (item) {
                r = crestSocket.write(item);
                console.log("Command sent to crestron with status: " + r);
            });
            //res.send(apiResponse('command is sent'));
        }
    });
    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            res.send(apiResponseBad(null));
        };
        // return res.send(apiResponse(results));
        var p_video = '';
        for (var i = 0; i < results.length; i++) {
            if (results[i].is_projector) {
                p_video = results[i].name
                break;
            }
        }
        var w_video = '';
        for (var i = 0; i < results.length; i++) {
            if (!results[i].is_projector) {
                w_video = results[i].name
                break;
            }
        }
        // return res.send(apiResponse(w_video));
        io.emit('change_video', w_video);
        io.emit('change_video_p', p_video);
        res.send(apiResponse('command is sent'));
    });

})

// app.get('/api/video/get_status', (req, res) => {

// })


app.get('/api/test', (req, res) => {
    const child_argv = [
        'test',
        'test2'
    ]

    //let child = child_process.fork(child_script_path, child_argv)
    var r;
    child_argv.forEach(function (item) {
        r = crestSocket.write(item);
        console.log("Command sent to crestron with status: " + r);
    });
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
    console.log('App Server started on port  %j', server.address().port);
});

crestServer.listen(58900, () => {
    console.log('Crestron Server started on port %j', crestServer.address().port);
});