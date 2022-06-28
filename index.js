const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql');
const cors = require('cors')

app.use(bodyParser.json());
app.use('/media/images', express.static('media/images'));
app.use(cors());

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root', /* MySQL User */
    password: '', /* MySQL Password */
    database: 'dgda' /* MySQL Database */
});

conn.connect((err) => {
    if (err) throw err;
    console.log('Mysql Connected with App...');
});

app.get('/api/rooms', (req, res) => {
    let sqlQuery = "SELECT * FROM rooms";

    let query = conn.query(sqlQuery, (err, results) => {
        if (err) throw err;
        results.map(function(result) {
            result.image = 'http://localhost:3000/media/images/'+result.image
            result.image_ar = 'http://localhost:3000/media/images/'+result.image_ar
        })
        res.send(apiResponse(results));
    });
});

app.get('/api/room/:id/phases_with_zones', (req, res) => {
    let sqlQuery = "SELECT * FROM phases WHERE room_id = " + req.params.id;

    let query = conn.query(sqlQuery, (err, phases) => {
        if (err) throw err;
        for (let i = 0; i < phases.length; i++) {
            let sqlQuery = "SELECT * FROM zones WHERE phase_id = " + phases[i].id;
            conn.query(sqlQuery, (err, zones) => {
                if (err) throw err;
                phases[i].zones = zones
            })
        }
        setTimeout(() => {
            res.send(apiResponse(phases));
        }, 100)
    });
});

app.get('/api/room/:id/light_scenes', (req, res) => {
    let sqlQuery = "SELECT * FROM light_scenes WHERE room_id = " + req.params.id;

    let query = conn.query(sqlQuery, (err, scenes) => {
        if (err) throw err;
        // for (let i = 0; i < scenes.length; i++) {
        //     let sqlQuery = "SELECT commands.*, command_light_scenes.light_scene_id AS pivot_light_scene_id, command_light_scenes.command_id AS pivot_command_id FROM commands INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id IN (" + scenes[i].id + ")";
        //     conn.query(sqlQuery, (err, commands) => {
        //         if (err) throw err;
        //         scenes[i].commands = commands
        //     })
        // }
        // setTimeout(() => {
            res.send(apiResponse(scenes));
        // }, 10)
    });
});

app.get('/api/room/:id/zones', (req, res) => {
    let sqlQuery = "SELECT * FROM zones WHERE room_id = " + req.params.id;

    let query = conn.query(sqlQuery, (err, scenes) => {
        if (err) throw err;
        // for (let i = 0; i < scenes.length; i++) {
        //     let sqlQuery = "SELECT commands.*, command_light_scenes.light_scene_id AS pivot_light_scene_id, command_light_scenes.command_id AS pivot_command_id FROM commands INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id IN (" + scenes[i].id + ")";
        //     conn.query(sqlQuery, (err, commands) => {
        //         if (err) throw err;
        //         scenes[i].commands = commands
        //     })
        // }
        // setTimeout(() => {
            res.send(apiResponse(scenes));
        // }, 10)
    });
});

app.get('/api/model/up', (req, res) => {
    res.send(apiResponse('Model up command is sent'));
})

app.get('/api/model/down', (req, res) => {
    res.send(apiResponse('Model down command is sent'));
})

app.get('/api/video/play', (req, res) => {
    res.send(apiResponse('Video play command is sent'));
})

app.get('/api/video/pause', (req, res) => {
    res.send(apiResponse('Video pause command is sent'));
})

app.get('/api/video/stop', (req, res) => {
    res.send(apiResponse('Video stop command is sent'));
})

app.get('/api/volume/increase', (req, res) => {
    res.send(apiResponse('Volume increase command is sent'));
})

app.get('/api/volume/decrease', (req, res) => {
    res.send(apiResponse('Volume decrease command is sent'));
})

app.get('/api/volume/mute', (req, res) => {
    res.send(apiResponse('Volume mute command is sent'));
})

function apiResponse(results) {
    // return JSON.stringify({ "status": 200, "error": null, "response": results });
    return { "status": 200, "error": null, "response": results };
}

app.listen(3000, () => {
    console.log('Server started on port 3000...');
});