const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const http = require('http');
const net = require('net');
const server = http.createServer(app);
const crestServer = net.createServer();
const modelServer = net.createServer();
const { Server } = require("socket.io");
const io = new Server(server);
require('dotenv').config();
var crestSocket, modelSocket;
var dateTime = require('node-datetime');
const moment = require("moment");
var videoInterval = {}
const pool = require('promise-mysql2').createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root', /* MySQL User */
    password: '', /* MySQL Password */
    database: 'dgda' /* MySQL Database */
});

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
});

// const pool = mysql2.createPool({
//     connectionLimit: 10,
//     host: 'localhost',
//     user: 'root', /* MySQL User */
//     password: '', /* MySQL Password */
//     database: 'dgda' /* MySQL Database */
//     // host: '18.170.155.197',
//     // user: 'admin_dgda_cms_user', /* MySQL User */
//     // password: '3S~9f7a7b', /* MySQL Password */
//     // database: 'admin_dgda_cms_db' /* MySQL Database */
// });

conn.connect((err) => {
    if (err) throw err;
    console.log('Mysql Connected with App...');
});


// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/pages/index.html');
// });

// app.get('/d_w_video', (req, res) => {
//     res.sendFile(__dirname + '/pages/d_w_video.html');
// });
// app.get('/ws_w_video_vlc', (req, res) => {
//     res.sendFile(__dirname + '/pages/ws_w_video_vlc.html');
// });

// app.get('/d_p_video', (req, res) => {
//     res.sendFile(__dirname + '/pages/d_p_video.html');
// });
// app.get('/ws_w_video', (req, res) => {
//     res.sendFile(__dirname + '/pages/ws_w_video.html');
// });

// app.get('/ws_p_video', (req, res) => {
//     res.sendFile(__dirname + '/pages/ws_p_video.html');
// });

// function setSocketDefault(socket) {
//     socket.setKeepAlive(true); // to keep the status connected
//     socket.setEncoding('utf8'); // to keep the communication textual
// }

crestServer.on("connection", (socket) => {
    console.log("Crestron connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    crestSocket = socket;
    socket.setKeepAlive(true); // to keep the status connected
    crestSocket.setKeepAlive(true); // to keep the status connected
});

modelServer.on("connection", (socket) => {
    console.log("Model connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    modelSocket = socket;
    socket.setKeepAlive(true); // to keep the status connected
    modelSocket.setKeepAlive(true); // to keep the status connected
});


io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    let room_id = socket.handshake.query.room_id;
    let is_projector = socket.handshake.query.is_projector;
    console.log('a user connected from room: ' + room_id + ' with projector: ' + is_projector);

    if(room_id && is_projector) {
        let sqlQuery = "SELECT media.name, media.is_projector FROM `media` INNER JOIN scenes ON scenes.id = media.scene_id WHERE scenes.room_id = " + room_id + " AND scenes.is_default = 1 AND media.is_projector = " + is_projector + " ORDER BY media.id DESC";
        let query = conn.query(sqlQuery, (err, results) => {
            if (err) {
                console.log(err)
            };
            var videourl = '';
            var event = '';
            // console.log(results)
            if (room_id == process.env.WS_ID) {
                if(is_projector == 0) {
                    event = 'change_default_video_wsw'
                    for (var i = 0; i < results.length; i++) {
                        if (!results[i].is_projector) {
                            videourl = encodeURI(process.env.PROD_VIDEO_PATH + results[i].name)
                            break;
                        }
                    }
                } else {
                    event = 'change_default_video_wsp'
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].is_projector) {
                            videourl = encodeURI(process.env.PROD_VIDEO_PATH + results[i].name)
                            break;
                        }
                    }
                }
            } else {
                if(is_projector == 0) {
                    event = 'change_default_video_dw'
                    for (var i = 0; i < results.length; i++) {
                        if (!results[i].is_projector) {
                            videourl = encodeURI(process.env.PROD_VIDEO_PATH + results[i].name)
                            break;
                        }
                    }
                } else {
                    event = 'change_default_video_dp'
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].is_projector) {
                            videourl = encodeURI(process.env.PROD_VIDEO_PATH + results[i].name)
                            break;
                        }
                    }
                }
            }
            //console.log(event)
            //console.log(videourl)
            io.emit(event, videourl);
            console.log('command is sent')
        });
    }

    socket.on('default_video', (msg) => {
        console.log(msg)
        console.log('show ended')
        let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN scenes ON scenes.id = command_scene.scene_id WHERE scenes.room_id = " + msg.room_id + " AND scenes.is_default = 1 ORDER BY command_scene.sort_order ASC";
        let sqlQuery2 = "SELECT media.name, media.is_projector FROM `media` INNER JOIN scenes ON scenes.id = media.scene_id WHERE scenes.room_id = " + msg.room_id + " AND scenes.is_default = 1 AND media.lang = '" + msg.lang + "' ORDER BY media.id DESC";
        // console.log(sqlQuery2);
        // return;
        if (process.env.APP_ENV == 'prod') {
            let query = conn.query(sqlQuery, (err, results) => {
                if (err) {
                    console.log(err)
                } else {
                    var execCommands = async () => {
                        await sendCrestCommands(results);
                    };
                    execCommands();
                }
            });
        }
        let query2 = conn.query(sqlQuery2, (err, results) => {
            if (err) {
                console.log(err)
            };
            // console.log(apiResponse(results))
            // return;
            var p_video = '';
            for (var i = 0; i < results.length; i++) {
                if (results[i].is_projector) {
                    p_video = encodeURI(process.env.PROD_VIDEO_PATH+results[i].name)
                    break;
                }
            }
            var w_video = '';
            for (var i = 0; i < results.length; i++) {
                if (!results[i].is_projector) {
                    w_video = encodeURI(process.env.PROD_VIDEO_PATH+results[i].name)
                    break;
                }
            }

            if (msg.room_id == process.env.WS_ID) {
                io.emit('change_default_video_wsw', w_video);
                io.emit('change_default_video_wsp', p_video);
            } else {
                io.emit('change_default_video_dw', w_video);
                io.emit('change_default_video_dp', p_video);
            }
            // io.emit('change_default_video', w_video);
            // io.emit('change_default_video_p', p_video);
            console.log('command is sent')
        });
    })
});

app.get('/api/rooms', (req, res) => {
    let sqlQuery = "SELECT id, name, name_ar, image, image_ar, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            return res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            if (process.env.APP_ENV == 'local') {
                result.image = process.env.LOCAL_IMG_PATH + result.image
            } else {
                result.image = process.env.PROD_IMG_PATH + result.image
            }
            // result.image_ar = /* process.env.PROD_IMG_PATH + */ result.image_ar
        })
        return res.send(apiResponse(results));
    });
});

app.get('/api/rooms/ar', (req, res) => {
    let sqlQuery = "SELECT id, name_ar as name, image_ar as image, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            return res.send(apiResponseBad(null));
        };
        results.map(function (result) {
            // result.image = /* process.env.PROD_IMG_PATH + */ result.image
            // result.image = process.env.PROD_IMG_PATH + result.image
            if (process.env.APP_ENV == 'local') {
                result.image = process.env.LOCAL_IMG_PATH + result.image
            } else {
                result.image = process.env.PROD_IMG_PATH + result.image
            }
        })
        return res.send(apiResponse(results));
    });
});

app.get('/api/room/:id/phases_with_zones', (req, res) => {
    // res.send(req.params.id);
    try {
        let sqlQuery = "SELECT id, name, image FROM phases WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, phases) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            for (let i = 0; i < phases.length; i++) {
                if (process.env.APP_ENV == 'local') {
                    phases[i].image = process.env.LOCAL_IMG_PATH + phases[i].image
                } else {
                    phases[i].image = process.env.PROD_IMG_PATH + phases[i].image
                }
                // phases[i].image = process.env.PROD_IMG_PATH + phases[i].image
                let sqlQuery = "SELECT id, name FROM zones WHERE phase_id = " + phases[i].id;
                conn.query(sqlQuery, (err, zones) => {
                    if (err) {
                        return res.send(apiResponseBad(null));
                    };
                    phases[i].zones = zones
                })
            }
            setTimeout(() => {
                return res.send(apiResponse(phases));
            }, 100)
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/phases_with_zones/ar', (req, res) => {
    // res.send(req.params.id);
    try {
        let sqlQuery = "SELECT id, name_ar as name, image_ar as image FROM phases WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, phases) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            for (let i = 0; i < phases.length; i++) {
                if (process.env.APP_ENV == 'local') {
                    phases[i].image = process.env.LOCAL_IMG_PATH + phases[i].image
                } else {
                    phases[i].image = process.env.PROD_IMG_PATH + phases[i].image
                }
                // phases[i].image = process.env.PROD_IMG_PATH + phases[i].image
                let sqlQuery = "SELECT id, name_ar as name FROM zones WHERE phase_id = " + phases[i].id;
                conn.query(sqlQuery, (err, zones) => {
                    if (err) {
                        return res.send(apiResponseBad(null));
                    };
                    phases[i].zones = zones
                })
            }
            setTimeout(() => {
                return res.send(apiResponse(phases));
            }, 100)
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/light_scenes', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name, image_en FROM light_scenes WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                return res.send(apiResponseBad(null));
            }
            scenes.map(function (result) {
                if (process.env.APP_ENV == 'local') {
                    result.image = process.env.LOCAL_IMG_PATH + result.image_en
                } else {
                    result.image = process.env.PROD_IMG_PATH + result.image_en
                }
                // result.image = process.env.PROD_IMG_PATH + result.image_en
            })
            return res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/light_scenes/ar', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name_ar as name, image_ar as image FROM light_scenes WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            scenes.map(function (result) {
                if (process.env.APP_ENV == 'local') {
                    result.image = process.env.LOCAL_IMG_PATH + result.image
                } else {
                    result.image = process.env.PROD_IMG_PATH + result.image
                }
                // result.image = process.env.PROD_IMG_PATH + result.image
            })
            return res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/zones', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name FROM zones WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            return res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/zones/ar', (req, res) => {
    try {
        let sqlQuery = "SELECT id, name_ar as name FROM zones WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            return res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/model/up', (req, res) => {
    if (modelSocket) {
        var r = modelSocket.write('MODELUP')
        console.log("Command sent to model with status: " + r);
        return res.send(apiResponse('Model up command is sent'));
    }
    else {
        console.log("Model Server not connected");
        return res.send(apiResponseBad('Model Server not connected'));
    }
})

app.get('/api/model/down', (req, res) => {
    if (modelSocket) {
        var r = modelSocket.write('MODELDOWN')
        console.log("Command sent to model with status: " + r);
        return res.send(apiResponse('Model up command is sent'));
    }
    else {
        console.log("Model Server not connected");
        return res.send(apiResponseBad('Model Server not connected'));
    }
})

app.get('/api/room/:id/video/resume', (req, res) => {
    // socket.on('video', (msg) => {
    if (req.params.id == process.env.WS_ID) {
        io.emit('video_wsw', 'play');
        io.emit('video_wsp', 'play');
    } else {
        io.emit('video_dw', 'play');
        io.emit('video_dp', 'play');
    }
    // io.emit('video', 'play');
    // io.emit('video_p', 'play');
    // });
    return res.send(apiResponse('Video play command is sent'));
})

app.get('/api/room/:id/video/forward', (req, res) => {
    if (req.params.id == process.env.WS_ID) {
        io.emit('video_wsw', 'forward');
        io.emit('video_wsp', 'forward');
    } else {
        io.emit('video_dw', 'forward');
        io.emit('video_dp', 'forward');
    }
    io.emit('video', 'forward');
    io.emit('video_p', 'forward');
    // });
    return res.send(apiResponse('Video forward command is sent'));
})

app.get('/api/room/:id/video/back', (req, res) => {
    // socket.on('video', (msg) => {
    if (req.params.id == process.env.WS_ID) {
        io.emit('video_wsw', 'back');
        io.emit('video_wsp', 'back');
    } else {
        io.emit('video_dw', 'back');
        io.emit('video_dp', 'back');
    }
    // io.emit('video', 'back');
    // io.emit('video_p', 'back');
    // });
    return res.send(apiResponse('Video back command is sent'));
})

app.get('/api/room/:id/video/pause', (req, res) => {
    // clearInterval(videoInterval[req.params.id].modalUpInterval)
    // clearInterval(videoInterval[req.params.id].modalDownInterval)

    // videoInterval[req.params.id].modalUpInterval = null;
    // videoInterval[req.params.id].modalDownInterval = null;
    // videoInterval[req.params.id].lastPlayed = new Date();

    // socket.on('video', (msg) => {
    if (req.params.id == process.env.WS_ID) {
        io.emit('video_wsw', 'pause');
        io.emit('video_wsp', 'pause');
    } else {
        io.emit('video_dw', 'pause');
        io.emit('video_dp', 'pause');
    }
    // });
    return res.send(apiResponse('Video pause command is sent'));
})

app.post('/api/room/:id/video/stop', (req, res) => {
    var lang;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        lang = 'en';
    } else {
        lang = req.body.lang
    }
    // return res.send(apiResponse(msg[1]));
    if (req.params.id == process.env.WS_ID) {
        io.emit('video_wsw', 'stop');
        io.emit('video_wsp', 'stop');
    } else {
        io.emit('video_dw', 'stop');
        io.emit('video_dp', 'stop');
    }
    // io.emit('video_stop', msg);
    // io.emit('video_p', 'stop');
    return res.send(apiResponse('Video stop command is sent'));
})

app.get('/api/volume/increase', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video_wsw', 'up');
    // });
    return res.send(apiResponse('Volume increase command is sent'));
})

app.get('/api/volume/decrease', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video_wsw', 'down');
    // });
    return res.send(apiResponse('Volume decrease command is sent'));
})

app.get('/api/volume/mute', (req, res) => {
    // socket.on('video', (msg) => {
    io.emit('video_wsw', 'mute');
    // });
    return res.send(apiResponse('Volume mute command is sent'));
})

app.get('/api/light_scene_command/:id', (req, res) => {
    let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " + req.params.id;

    // res.send(apiResponse(sqlQuery));
    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            return res.send(apiResponseBad(null));
        } else {
            var execCommands = async () => {
                await sendCrestCommands(results);
            };
            execCommands();
            return res.send(apiResponse('command is sent'));
        }
    });
})

function sendCrestCommands(results) {
    var crestCommands = results.map((result) => {
        if (result.device == process.env.CREST_DEVICE) {
            return result.name;
        }
    });
    crestCommands = crestCommands.filter(function (element) {
        return element !== undefined;
    });
    console.log(crestCommands);

    var r, dt;
    crestCommands.forEach(function (item, index) {
        setTimeout(function () {
            dt = dateTime.create();
            if (crestSocket) r = crestSocket.write(item);
            var formatted = dt.format('Y-m-d H:M:S:N');
            console.log(formatted + ": Command sent to crestron with status: " + r + ", Delay: " + results[index].delay);
        }, index * results[index].delay)
    });
}

function sendModelCommands(results) {
    var modelCommands = results.map((result) => {
        if (result.device == process.env.MODEL_DEVICE)
            return result.name;
    })
    modelCommands = modelCommands.filter(function (element) {
        return element !== undefined;
    });
    console.log(modelCommands);
    var r, dt;
    modelCommands.forEach(async function (item, index) {
        if (item == process.env.MODEL_UP) await sleep(results[index].model_up_delay * 1000);
        if (item == process.env.MODEL_DOWN) await sleep(results[index].model_down_delay * 1000);
        setTimeout(function () {
            dt = dateTime.create();
            if (modelSocket) r = modelSocket.write(item);
            var formatted = dt.format('Y-m-d H:M:S:N');
            console.log(formatted + ": " + item + " sent to model with status: " + r + ", Delay: " + results[index].delay);
        }, index * results[index].delay)
    });
}

function sendModelCommands2(id, results, duration) {
    if (!videoInterval[id]) {
        videoInterval[id] = {
            modalUpInterval: null,
            modalDownInterval: null,
            duration,
            isModalUpExecuted: false,
            isModalDownExecuted: false,
            modalUpDelay: 0,
            modalDownDelay: 0,
            lastPlayed: new Date()
        }
    }

    if (results?.length) {
        let modelCommands = results.map((result) => {
            if (result.device === process.env.MODEL_DEVICE)
                return result.name;
        })
        modelCommands = modelCommands.filter(function (element) {
            return element !== undefined;
        });

        let r, dt;
        modelCommands.forEach(async function (item, index) {
            if (item === process.env.MODEL_UP) videoInterval[id].modalUpDelay = results[index].model_up_delay;
            if (item === process.env.MODEL_DOWN) videoInterval[id].modalDownDelay = results[index].model_down_delay;
        });
    }

    const playedDuration = moment().subtract(moment(videoInterval[id].lastPlayed));

    const remainingModalUpDuration = videoInterval[id].modalUpDelay - playedDuration;
    if (remainingModalUpDuration > 0 && !videoInterval[id].isModalUpExecuted) {
        videoInterval[id].modalUpInterval = setTimeout(function () {
            const dt = dateTime.create();
            let r;
            if (modelSocket) r = modelSocket.write(process.env.MODEL_UP);
            else console.log('Model Up')
            const formatted = dt.format('Y-m-d H:M:S:N');
            videoInterval[id].isModalUpExecuted = true
            // clearInterval(videoInterval[req.params.id].modalUpInterval)
            console.log(formatted + ": " + process.env.MODEL_UP + " sent to model with status: " + r + ", Delay: " + videoInterval[id].modalUpDelay);
        }, remainingModalUpDuration * 1000)
    }

    const remainingModalDownDuration = videoInterval[id].modalDownDelay - playedDuration;
    if (remainingModalDownDuration > 0 && !videoInterval[id].isModalDownExecuted) {
        videoInterval[id].modalDownInterval = setTimeout(function () {
            const dt = dateTime.create();
            let r;
            if (modelSocket) r = modelSocket.write(process.env.MODEL_DOWN);
            else console.log('Model Down')
            const formatted = dt.format('Y-m-d H:M:S:N');
            videoInterval[id].isModalDownExecuted = true
            // clearInterval(videoInterval[req.params.id].modalDownInterval)
            console.log(formatted + ": " + process.env.MODEL_DOWN + " sent to model with status: " + r + ", Delay: " + videoInterval[id].modalDownDelay);
        }, remainingModalDownDuration * 1000)
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

app.post('/api/room/:id/play_scene', async (req, res) => {
    let lang = 'en';
    if (!(req.body.constructor === Object && Object.keys(req.body).length === 0)) {
        lang = req.body.lang
    }

    let sqlQuery = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device, scenes.model_up_delay, scenes.model_down_delay FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN scenes ON scenes.id = command_scene.scene_id INNER JOIN rooms ON rooms.scene_id = command_scene.scene_id WHERE rooms.id = " + req.params.id + " ORDER BY command_scene.sort_order ASC";
    let sqlQuery2 = "SELECT media.name, media.is_projector, media.duration, media.is_image FROM `media` INNER JOIN rooms ON rooms.scene_id = media.scene_id WHERE media.zone_id IS null AND media.room_id = " + req.params.id + " AND lang = '" + lang + "' ORDER BY media.id DESC";

    try {
        const [results] = await pool.query(sqlQuery);
        const [results2] = await pool.query(sqlQuery2);

        if (!results?.length || !results2?.length)
            return res.send(apiResponseBad(null));

        let p_video, w_video, duration = 0;
        for (let i = 0; i < results2.length; i++) {
            if (results2[i].is_projector) {
                p_video = [
                    encodeURI(process.env.PROD_VIDEO_PATH + results2[i].name),
                    results2[i].is_image,
                ]
                // p_video = encodeURI(process.env.PROD_VIDEO_PATH + results2[i].name)
                break;
            }
        }

        for (let i = 0; i < results2.length; i++) {
            if (!results2[i].is_projector) {
                w_video = [
                    encodeURI(process.env.PROD_VIDEO_PATH + results2[i].name),
                    lang
                ]
                // w_video = encodeURI(process.env.PROD_VIDEO_PATH + results2[i].name)
                duration = results2[i].duration
                break;
            }
        }

        if (process.env.APP_ENV === 'prod') {
            const execCommands = async () => {
                await sendCrestCommands(results);
                if (req.params.id !== process.env.WS_ID)
                    await sendModelCommands(results);
            };

            await execCommands();
        }

        // return res.send(apiResponse(w_video));
        if (req.params.id === process.env.WS_ID) {

            console.log('WALL'+w_video)
            console.log('pROJECTOR'+p_video)
            io.emit('change_video_wsw', w_video);
            io.emit('change_video_wsp', p_video);
        } else {
            console.log('WALL'+w_video)
            console.log('pROJECTOR'+p_video)
            io.emit('change_video_dw', w_video);
            io.emit('change_video_dp', p_video);
        }
        return res.send(apiResponse(duration));
    } catch (err) {
        return res.send(apiResponseBad(err));
    }

})

app.post('/api/zone/:id/play_scene', (req, res) => {
    var lang;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        lang = 'en';
    } else {
        lang = req.body.lang
    }
    let sqlQuery = "SELECT media.name, media.is_projector, media.duration, media.is_image FROM `media` WHERE zone_id = " + req.params.id + " AND lang = '" + lang + "' ORDER BY media.id DESC";
    let sqlQuery2 = "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN zones ON zones.scene_id = command_scene.scene_id WHERE zones.id = " + req.params.id + " ORDER BY command_scene.sort_order ASC";

    // return res.send(apiResponse(sqlQuery2));
    if (process.env.APP_ENV == 'prod') {
        let query2 = conn.query(sqlQuery2, (err, results) => {
            if (err) {
                return res.send(apiResponseBad(null));
            } else {
                var execCommands = async () => {
                    await sendCrestCommands(results);
                };
                execCommands();
            }
        });
    }
    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            return res.send(apiResponseBad(null));
        };
        // return res.send(apiResponse(results));
        var p_video = '';
        var duration = 0;
        for (var i = 0; i < results.length; i++) {
            if (results[i].is_projector) {
                p_video = [
                    encodeURI(process.env.PROD_VIDEO_PATH + results[i].name),
                    results[i].is_image,
                ]
                break;
            }
        }
        var w_video = '';
        for (var i = 0; i < results.length; i++) {
            if (!results[i].is_projector) {
                w_video = [
                    encodeURI(process.env.PROD_VIDEO_PATH + results[i].name),
                    lang
                ]
                duration = results[i].duration
                break;
            }
        }
        // return res.send(apiResponse(w_video));
        if (req.params.id == process.env.WS_ID) {
            io.emit('change_video_wsw', w_video);
            io.emit('change_video_wsp', p_video);
        } else {
            io.emit('change_video_dw', w_video);
            io.emit('change_video_dp', p_video);
        }
        // io.emit('change_video', w_video);
        // io.emit('change_video_p', p_video);
        return res.send(apiResponse(duration));
    });
})

app.get('/api/room/:id/get_play_wall_video', (req, res) => {
    try {
        let sqlQuery = "SELECT id, title_en FROM `wall_media` WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, results) => {
            if (err) {
                return res.send(apiResponseBad(null));
            }
            results.map(function (result) {
                result.title = result.title_en
            })
            return res.send(apiResponse(results));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});

app.get('/api/room/:id/get_play_wall_video/ar', (req, res) => {
    try {
        let sqlQuery = "SELECT id, title_ar FROM `wall_media` WHERE room_id = " + req.params.id;

        let query = conn.query(sqlQuery, (err, scenes) => {
            if (err) {
                return res.send(apiResponseBad(null));
            };
            scenes.map(function (result) {
                result.title = result.title_ar
            })
            return res.send(apiResponse(scenes));
        });
    } catch (error) {
        console.log(error)
        return res.send(apiResponseBad(null));
    }
});
app.get('/api/play_wall_video/:id', (req, res) => {
    let sqlQuery = "SELECT id, name, room_id, duration FROM `wall_media` WHERE id = " + req.params.id ;

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) {
            return res.send(apiResponseBad(null));
        };
        var w_video = '';
        var duration = 0;
        for (var i = 0; i < results.length; i++) {
            if (!results[i].is_projector) {
                w_video = [
                    encodeURI(process.env.PROD_VIDEO_PATH + results[i].name),
                    'lang'
                ]
                duration = results[i].duration
                break;
            }
        }
        // return res.send(apiResponse(w_video));
        if (req.params.id == process.env.WS_ID) {
            io.emit('change_video_wsw', w_video);
        } else {
            io.emit('change_video_dw', w_video);
        }
        return res.send(apiResponse(duration));
    });
})

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
    return res.send(apiResponseBad(null));
})

function apiResponse(results) {
    // return JSON.stringify({ "status": 200, "error": null, "response": results });
    return { "status": 200, "error": null, "response": results };
}

function apiResponseBad(results) {
    // return JSON.stringify({ "status": 200, "error": null, "response": results });
    return { "status": 500, "error": true, "response": results };
}

server.listen(process.env.APP_PORT, () => {
    console.log('App Server started on port  %j', server.address().port);
});

crestServer.listen(process.env.CREST_PORT, () => {
    console.log('Crestron Server started on port %j', crestServer.address().port);
});

modelServer.listen(process.env.MODEL_PORT, () => {
    console.log('Model server started on port %j', modelServer.address().port);
});

// wswallServer.listen(process.env.WSWPORT, () => {
//     console.log('Model server started on port %j', wswallServer.address().port);
// });

// wsprojServer.listen(process.env.WSPPORT, () => {
//     console.log('Model server started on port %j', wsprojServer.address().port);
// });

// diwallServer.listen(process.env.DWPORT, () => {
//     console.log('Model server started on port %j', diwallServer.address().port);
// });

// diprojServer.listen(process.env.DPPORT, () => {
//     console.log('Model server started on port %j', diprojServer.address().port);
// });
