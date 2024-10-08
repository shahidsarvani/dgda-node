const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const http = require("http");
const net = require("net");
const server = http.createServer(app);
const crestServer = net.createServer();
const modelServer = net.createServer();
const { Server } = require("socket.io");
const io = new Server(server);
require("dotenv").config();
var crestSocket, modelSocket;
var dateTime = require("node-datetime");
const moment = require("moment");
const { env } = require("process");
var videoInterval = {};
var timeInterval = 0;
var videoPlayed = 0;

const dbConfig = {
  host: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};
const pool = require("promise-mysql2").createPool(dbConfig);

app.use(bodyParser.json());
app.use("/media/images", express.static("media/images"));
app.use("/media/video", express.static("media/video"));
app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// const WebSocket = require("ws");

// const wss = new WebSocket.Server({ port: 8080 });

// wss.on("connection", (ws) => {
//   console.log("New client connected");

//   ws.on("message", (message) => {
//     console.log(`Received message => ${message}`);
//     try {
//       const data = JSON.parse(message);
//       wss.clients.forEach((client) => {
//         if (client.readyState === WebSocket.OPEN) {
//           client.send(JSON.stringify(data));
//         }
//       });
//     } catch (e) {
//       console.error("Error parsing JSON:", e);
//     }
//   });

//   ws.on("close", () => {
//     console.log("Client disconnected");
//   });
// });

// const wss2 = new WebSocket.Server({ port: 3001 });

// wss2.on("connection", (ws) => {
//   console.log("Client connected on port 3001");

//   ws.on("message", (message) => {
//     console.log(`Received message on port 3001 => ${message}`);
//     ws.send("Message received on port 3001");
//   });

//   ws.on("close", () => {
//     console.log("Client disconnected from port 3001");
//   });
// });

// console.log("WebSocket server is running on ws://localhost:8080");

const conn = mysql.createConnection(dbConfig);

var mysqlConnected = () =>
  conn.connect((err) => {
    if (err) console.log(err);
    LogToConsole("Mysql Connected with App...");
  });

conn.on("error", (err) => {
  console.log(err);
  setTimeout(mysqlConnected, 3000);
});

var crestConnected = () =>
  crestServer.on("connection", (socket) => {
    LogToConsole(
      "Crestron connection details - " +
        socket.remoteAddress +
        ":" +
        socket.remotePort
    );
    crestSocket = socket;
    socket.setKeepAlive(true); // to keep the status connected
    crestSocket.setKeepAlive(true); // to keep the status connected

    socket.on("disconnect", function () {
      LogToConsole("Crestron disconnected");
      crestSocket = null;
    });

    socket.on("close", function () {
      LogToConsole("Crestron disconnected");
      crestSocket = null;
    });
  });

crestServer.on("error", (err) => {
  console.log(err);
  crestSocket = null;
  setTimeout(crestConnected, 3000);
});

var modelConnected = () =>
  modelServer.on("connection", (socket) => {
    LogToConsole(
      "Model connection details - " +
        socket.remoteAddress +
        ":" +
        socket.remotePort
    );
    modelSocket = socket;
    socket.setKeepAlive(true); // to keep the status connected
    modelSocket.setKeepAlive(true); // to keep the status connected

    socket.on("disconnect", function () {
      LogToConsole("Model Application disconnected");
      modelSocket = null;
    });

    socket.on("close", function () {
      LogToConsole("Model Application disconnected");
      modelSocket = null;
    });
  });

modelServer.on("error", (err) => {
  console.log(err);
  modelSocket = null;
  setTimeout(modelConnected, 3000);
});

var ioConnected = () =>
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      LogToConsole("user disconnected");
    });
    let room_id = socket.handshake.query.room_id;
    let is_projector = socket.handshake.query.is_projector;

    if (room_id && is_projector) {
      LogToConsole(
        "a user connected from room: " +
          room_id +
          " with projector: " +
          is_projector
      );

      try {
        if (playDefaultScene(room_id, "en", 0)) {
          LogToConsole("default scene command sent successfully");
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      LogToConsole("nope");
    }

    socket.on("default_video", (msg) => {
      try {
        // console.log(msg);
        // LogToConsole('show ended')
        if (playDefaultScene(msg.room_id, msg.lang, 1)) {
          LogToConsole("default scene command sent successfully");
        }
      } catch (err) {
        console.log(err);
      }
    });
  });

io.on("error", (err) => {
  console.log(err);
  setTimeout(ioConnected, 3000);
});

mysqlConnected();
crestConnected();
modelConnected();
ioConnected();

process.on("uncaughtException", function (err) {
  console.log(err);
  setTimeout(mysqlConnected, 1000);
  setTimeout(crestConnected, 1000);
  setTimeout(modelConnected, 1000);
  setTimeout(ioConnected, 1000);
});

app.get("/api/rooms", async (req, res) => {
  let sqlQuery =
    "SELECT id, name, name_ar, image, image_ar, icon, icon_ar, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

  try {
    const [results] = await pool.query(sqlQuery);
    //console.log(results);

    if (!results?.length) return res.send(apiResponseBad(null));

    results.map(function (result) {
      result.image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image;
      result.image_ar =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image_ar;
      result.icon =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.icon;
      result.icon_ar =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.icon_ar;
    });
    return res.send(apiResponse(results));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/rooms/ar", async (req, res) => {
  let sqlQuery =
    "SELECT id, name_ar as name, image_ar as image, has_model FROM rooms WHERE type = 1 AND status = 1 ORDER BY name";

  try {
    const [results] = await pool.query(sqlQuery);
    //console.log(results);

    if (!results?.length) return res.send(apiResponseBad(null));

    results.map(function (result) {
      if (process.env.APP_ENV == "local") {
        result.image = process.env.LOCAL_IMG_PATH + result.image;
      } else {
        result.image = process.env.PROD_IMG_PATH + result.image;
      }
    });
    return res.send(apiResponse(results));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/phases_with_zones", async (req, res) => {
  // res.send(req.params.id);
  let sqlQuery =
    "SELECT id, name, image FROM phases WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [phases] = await pool.query(sqlQuery);
    // console.log(phases)

    if (!phases?.length) return res.send(apiResponseBad(null));

    for (let i = 0; i < phases.length; i++) {
      phases[i].image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + phases[i].image;
      // console.log(phases[i].name)
      let sqlQuery =
        "SELECT id, name FROM zones WHERE status = 1 AND phase_id = " +
        phases[i].id;
      let [zones] = await pool.query(sqlQuery);

      phases[i].zones = zones;
    }
    return res.send(apiResponse(phases));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/phases_with_zones/ar", async (req, res) => {
  // res.send(req.params.id);
  let sqlQuery =
    "SELECT id, name_ar as name, image_ar as image FROM phases WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [phases] = await pool.query(sqlQuery);
    //console.log(phases);

    if (!phases?.length) return res.send(apiResponseBad(null));

    for (let i = 0; i < phases.length; i++) {
      phases[i].image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + phases[i].image;

      let sqlQuery =
        "SELECT id, name_ar as name FROM zones WHERE status = 1 AND phase_id = " +
        phases[i].id;
      let [zones] = await pool.query(sqlQuery);

      phases[i].zones = zones;
    }
    return res.send(apiResponse(phases));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/light_scenes", async (req, res) => {
  let sqlQuery =
    "SELECT id, name, image_en FROM light_scenes WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [scenes] = await pool.query(sqlQuery);
    if (!scenes?.length) return res.send(apiResponseBad(null));

    scenes.map(function (result) {
      result.image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image_en;
    });
    return res.send(apiResponse(scenes));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/light_scenes/ar", async (req, res) => {
  let sqlQuery =
    "SELECT id, name_ar as name, image_ar as image FROM light_scenes WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [scenes] = await pool.query(sqlQuery);
    if (!scenes?.length) return res.send(apiResponseBad(null));

    scenes.map(function (result) {
      result.image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image_en;
    });
    return res.send(apiResponse(scenes));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/zones", async (req, res) => {
  let sqlQuery =
    "SELECT id, name FROM zones WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [scenes] = await pool.query(sqlQuery);
    if (!scenes?.length) return res.send(apiResponseBad(null));

    scenes.map(function (result) {
      result.image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image_en;
    });
    return res.send(apiResponse(scenes));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/zones/ar", async (req, res) => {
  let sqlQuery =
    "SELECT id, name_ar as name FROM zones WHERE status = 1 AND room_id = " +
    req.params.id;

  try {
    let [scenes] = await pool.query(sqlQuery);
    if (!scenes?.length) return res.send(apiResponseBad(null));

    scenes.map(function (result) {
      result.image =
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_IMG_PATH
          : process.env.LOCAL_IMG_PATH) + result.image_en;
    });
    return res.send(apiResponse(scenes));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/model/up", (req, res) => {
  if (modelSocket) {
    var r = modelSocket.write("MODELUP");
    LogToConsole("Command sent to model with status: " + r);
    return res.send(apiResponse("Model up command is sent"));
  } else {
    LogToConsole("Model Server not connected");
    return res.send(apiResponseBad("Model Server not connected"));
  }
});

app.get("/api/model/down", (req, res) => {
  if (modelSocket) {
    var r = modelSocket.write("MODELDOWN");
    LogToConsole("Command sent to model with status: " + r);
    return res.send(apiResponse("Model up command is sent"));
  } else {
    LogToConsole("Model Server not connected");
    return res.send(apiResponseBad("Model Server not connected"));
  }
});

app.get("/api/room/:id/video/resume/:type", async (req, res) => {
  const roomId = req.params.id;

  if (roomId === process.env.WS_ID) {
    io.emit("video_wsw", "play");
    io.emit("video_wsp", "play");
    console.log("Play command emitted to WS.");
  } else {
    if (req.params.type == 1) {
      let startTime = 0;
      if (videoInterval && videoInterval[roomId]) {
        const intervals = videoInterval[roomId];
        startTime = intervals.elapsedTime || 0;
      }
      timeInterval = setInterval(() => {
        videoPlayed++;
        console.log(`Video played time: ${videoPlayed} seconds`);
      }, 1000);

      const execCommands = async () => {
        if (req.params.id !== process.env.WS_ID) {
          console.log(
            `sendModelCommands2 will be called for room ID: ${req.params.id}`
          );
          await sendModelCommands2(req.params.id, []);
          console.log("sendModelCommands2 executed.");
        }
      };
      await execCommands();
      videoPlayed = startTime;
      console.log(`Resumed timer from ${videoPlayed} seconds.`);
    }
    io.emit("video_dw", "play");
    io.emit("video_dp", "play");
  }

  return res.send(apiResponse("Video play command is sent"));
});

app.get("/api/room/:id/video/forward", (req, res) => {
  if (req.params.id == process.env.WS_ID) {
    io.emit("video_wsw", "forward");
    io.emit("video_wsp", "forward");
  } else {
    io.emit("video_dw", "forward");
    io.emit("video_dp", "forward");
  }
  return res.send(apiResponse("Video forward command is sent"));
});

app.get("/api/room/:id/video/back", (req, res) => {
  if (req.params.id == process.env.WS_ID) {
    io.emit("video_wsw", "back");
    io.emit("video_wsp", "back");
  } else {
    io.emit("video_dw", "back");
    io.emit("video_dp", "back");
  }
  return res.send(apiResponse("Video back command is sent"));
});

app.get("/api/room/:id/video/pause", (req, res) => {
  const roomId = req.params.id;

  if (videoInterval) {
    console.log("videoInterval is defined.");
    console.log(
      "Number of keys in videoInterval:",
      Object.keys(videoInterval).length
    );
    console.log("Current state of videoInterval:", videoInterval);
  } else {
    console.log("videoInterval is not defined.");
  }

  if (videoInterval && Object.keys(videoInterval).length > 0) {
    console.log("videoInterval has data.");

    if (videoInterval[roomId]) {
      const intervals = videoInterval[roomId];
      console.log(`Intervals found for room ID: ${roomId}`);

      // Calculate and store the elapsed time
      if (intervals.lastPlayed) {
        const currentTime = new Date();
        intervals.elapsedTime = Math.floor(
          (currentTime - new Date(intervals.lastPlayed)) / 1000
        );
        console.log(
          `Elapsed time before pause: ${intervals.elapsedTime} seconds`
        );
      } else {
        intervals.elapsedTime = 0;
        console.log("No lastPlayed timestamp found. Elapsed time set to 0.");
      }

      if (intervals.modalUpInterval || intervals.modalDownInterval) {
        console.log("Clearing modal intervals...");
        clearInterval(intervals.modalUpInterval);
        clearInterval(intervals.modalDownInterval);
        intervals.modalUpInterval = null;
        intervals.modalDownInterval = null;
        console.log("Modal intervals cleared and set to null.");
      }

      if (timeInterval) {
        console.log("Clearing time interval...");
        clearInterval(timeInterval);
        timeInterval = null;
        console.log("Time interval cleared and set to null.");
      }

      intervals.lastPlayed = new Date();
      console.log(`Last played timestamp updated: ${intervals.lastPlayed}`);
    } else {
      console.log(`No intervals found for room ID: ${roomId}`);
    }
  } else {
    console.log("videoInterval is empty or not defined.");
  }

  if (roomId === process.env.WS_ID) {
    io.emit("video_wsw", "pause");
    io.emit("video_wsp", "pause");
    console.log("Pause command emitted to WS.");
  } else {
    io.emit("video_dw", "pause");
    io.emit("video_dp", "pause");
    console.log("Pause command emitted to DW.");
  }

  return res.send(apiResponse("Video pause command is sent"));
});

app.post("/api/room/:id/video/stop", (req, res) => {
  if (req.params.id !== process.env.WS_ID) {
    console.log("=================================");
    console.log(videoInterval);
    console.log("=================================");
    console.log(Object.keys(videoInterval).length);
    if (videoInterval && Object.keys(videoInterval).length > 0) {
      console.log("cleared interval 1");
      console.log(Object.keys(videoInterval[req.params.id]).length);
      if (Object.keys(videoInterval[req.params.id]).length > 0) {
        console.log(videoInterval[req.params.id]);
        clearInterval(videoInterval[req.params.id].modalUpInterval);
        clearInterval(videoInterval[req.params.id].modalDownInterval);
        clearInterval(timeInterval);
        videoPlayed = 0;
        videoInterval = {};
        console.log("cleared interval 2");
      }
    }
    //console.log(videoInterval[req.params.id])
  }
  var lang = "en";
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    if (req.body.lang != null && req.body.lang != "") lang = req.body.lang;
  }

  if (req.params.id == process.env.WS_ID) {
    io.emit("video_wsw", "stop");
    io.emit("video_wsp", "stop");
  } else {
    io.emit("video_dw", "stop");
    io.emit("video_dp", "stop");
  }
  return res.send(apiResponse("Video stop command is sent"));
});

app.get("/api/room/:id/volume/increase", (req, res) => {
  var event = "";
  if (req.params.id == process.env.WS_ID) {
    event = "video_wsw";
  } else {
    event = "video_dw";
  }
  io.emit(event, "up");
  return res.send(apiResponse("Volume increase command is sent"));
});

app.get("/api/room/:id/volume/decrease", (req, res) => {
  var event = "";
  if (req.params.id == process.env.WS_ID) {
    event = "video_wsw";
  } else {
    event = "video_dw";
  }
  io.emit(event, "down");
  return res.send(apiResponse("Volume decrease command is sent"));
});

app.get("/api/room/:id/volume/mute", (req, res) => {
  var event = "";
  var args = "mute";
  if (req.params.id == process.env.WS_ID) {
    event = "video_wsw";
  } else {
    event = "video_dw";
  }
  io.emit(event, args);
  return res.send(apiResponse("Volume mute command is sent"));
});

app.get("/api/light_scene_command/:id", async (req, res) => {
  let sqlQuery =
    "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_light_scenes ON commands.id = command_light_scenes.command_id WHERE command_light_scenes.light_scene_id = " +
    req.params.id;

  try {
    let [results] = await pool.query(sqlQuery);
    if (!results?.length) return res.send(apiResponseBad(null));
    var execCommands = async () => {
      await sendCrestCommands(results);
    };
    execCommands();
    return res.send(apiResponse("command is sent"));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

function sendCrestCommands(results) {
  var crestCommands = results.map((result) => {
    if (result.device == process.env.CREST_DEVICE) {
      return result.name;
    }
  });
  crestCommands = crestCommands.filter(function (element) {
    return element !== undefined;
  });
  // console.log(crestCommands);

  var r;
  crestCommands.forEach(function (item, index) {
    setTimeout(function () {
      if (crestSocket) r = crestSocket.write(item);
      LogToConsole(
        "Command sent to crestron with status: " +
          r +
          ", Delay: " +
          results[index].delay
      );
    }, index * results[index].delay);
  });
}

async function sendModelCommands2(id, results) {
  let videoPlayed = 0;

  // Timer to track video play time
  timeInterval = setInterval(() => {
    videoPlayed++;
    console.log(`Video ID ${id} has been playing for ${videoPlayed} seconds.`);
  }, 1000);

  if (!videoInterval[id]) {
    videoInterval[id] = {
      modalUpInterval: null,
      modalDownInterval: null,
      isModalUpExecuted: false,
      isModalDownExecuted: false,
      modalUpDelay: 0,
      modalDownDelay: 0,
      lastPlayed: new Date(),
    };
  }

  if (results?.length) {
    let modelCommands = results
      .map((result) => {
        if (result.device === process.env.MODEL_DEVICE) return result.name;
      })
      .filter((element) => element !== undefined);

    await Promise.all(
      modelCommands.map(async (item, index) => {
        if (item === process.env.MODEL_UP) {
          videoInterval[id].modalUpDelay = results[index].model_up_delay;
        }
        if (item === process.env.MODEL_DOWN) {
          videoInterval[id].modalDownDelay = results[index].model_down_delay;
        }
      })
    );
  }

  var playedDuration = moment().subtract(moment(videoInterval[id].lastPlayed));
  var remainingModalUpDuration = videoInterval[id].modalUpDelay - videoPlayed;

  if (remainingModalUpDuration >= 0 && !videoInterval[id].isModalUpExecuted) {
    videoInterval[id].modalUpInterval = setTimeout(() => {
      let r;
      if (modelSocket) {
        r = modelSocket.write(process.env.MODEL_UP);
      } else {
        console.log("Model Up");
      }
      if (videoInterval[id]) {
        videoInterval[id].isModalUpExecuted = true;
        console.log(
          process.env.MODEL_UP +
            " sent to model with status: " +
            r +
            ", Delay: " +
            videoInterval[id].modalUpDelay
        );
      }
    }, remainingModalUpDuration * 1000);
  }

  var remainingModalDownDuration =
    videoInterval[id].modalDownDelay - videoPlayed;

  if (
    remainingModalDownDuration >= 0 &&
    !videoInterval[id].isModalDownExecuted
  ) {
    videoInterval[id].modalDownInterval = setTimeout(() => {
      let r;
      if (modelSocket) {
        r = modelSocket.write(process.env.MODEL_DOWN);
      } else {
        console.log("Model Down");
      }
      if (videoInterval[id]) {
        videoInterval[id].isModalDownExecuted = true;
        console.log(
          process.env.MODEL_DOWN +
            " sent to model with status: " +
            r +
            ", Delay: " +
            videoInterval[id].modalDownDelay
        );
      }
    }, remainingModalDownDuration * 1000);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

app.post("/api/room/:id/play_scene", async (req, res) => {
  let lang = "en";
  if (
    !(req.body.constructor === Object && Object.keys(req.body).length === 0)
  ) {
    if (req.body.lang != null && req.body.lang != "") lang = req.body.lang;
  }
  if (req.params.id !== process.env.WS_ID) clearIntervals();

  let sqlQuery =
    "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device, scenes.model_up_delay, scenes.model_down_delay FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN scenes ON scenes.id = command_scene.scene_id INNER JOIN rooms ON rooms.scene_id = command_scene.scene_id WHERE rooms.id = " +
    req.params.id +
    " ORDER BY command_scene.sort_order ASC";
  if (lang == "ar")
    sqlQuery =
      "SELECT commands.name, (SELECT delay FROM settings WHERE id = 1) as delay, hardware.device, scenes.model_up_delay_ar AS model_up_delay, scenes.model_down_delay_ar AS model_down_delay FROM `commands` INNER JOIN hardware ON hardware.id = commands.hardware_id INNER JOIN command_scene ON command_scene.command_id = commands.id INNER JOIN scenes ON scenes.id = command_scene.scene_id INNER JOIN rooms ON rooms.scene_id = command_scene.scene_id WHERE rooms.id = " +
      req.params.id +
      " ORDER BY command_scene.sort_order ASC";
  let sqlQuery2 =
    "SELECT media.name, media.is_projector, media.duration, media.is_image FROM `media` INNER JOIN rooms ON rooms.scene_id = media.scene_id WHERE media.zone_id IS null AND media.room_id = " +
    req.params.id +
    " AND lang = '" +
    lang +
    "' ORDER BY media.id DESC";
  // return res.send(apiResponseBad(sqlQuery2))
  try {
    const [results] = await pool.query(sqlQuery);
    const [results2] = await pool.query(sqlQuery2);

    // LogToConsole(sqlQuery);
    // console.log(results);

    if (!results?.length || !results2?.length)
      return res.send(apiResponseBad(null));

    let p_video,
      w_video,
      duration = 0;
    for (let i = 0; i < results2.length; i++) {
      if (results2[i].is_projector) {
        p_video = [
          encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results2[i].name
          ),
          lang,
        ];
        break;
      }
    }

    for (let i = 0; i < results2.length; i++) {
      if (!results2[i].is_projector) {
        w_video = [
          encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results2[i].name
          ),
          lang,
        ];
        duration = results2[i].duration;
        break;
      }
    }

    if (process.env.APP_ENV === "prod") {
      const execCommands = async () => {
        console.log("Executing Crest commands...");
        await sendCrestCommands(results);
        console.log("Crest commands executed.");

        if (req.params.id !== process.env.WS_ID) {
          console.log(
            `sendModelCommands2 will be called for room ID: ${req.params.id}`
          );
          await sendModelCommands2(req.params.id, results);
          console.log("sendModelCommands2 executed.");
        } else {
          console.log(
            `Room ID ${req.params.id} matches WS_ID, skipping sendModelCommands2.`
          );
        }
      };

      await execCommands();
    }

    LogToConsole("WALL: " + JSON.stringify(w_video));
    LogToConsole("PROJECTOR: " + JSON.stringify(p_video));
    if (req.params.id === process.env.WS_ID) {
      io.emit("change_video_wsw", w_video);
      io.emit("change_video_wsp", p_video);
    } else {
      io.emit("change_video_dw", w_video);
      io.emit("change_video_dp", p_video);
    }
    return res.send(apiResponse(duration + 2));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.post("/api/zone/:id/play_scene", async (req, res) => {
  let lang = "en";
  if (
    !(req.body.constructor === Object && Object.keys(req.body).length === 0)
  ) {
    if (req.body.lang != null && req.body.lang != "") lang = req.body.lang;
  }

  let sqlQuery =
    "SELECT media.name, media.is_projector, media.duration, media.is_image, media.room_id FROM `media` WHERE zone_id = " +
    req.params.id +
    " AND lang = '" +
    lang +
    "' ORDER BY media.id DESC";
  // LogToConsole(sqlQuery);
  try {
    const [results] = await pool.query(sqlQuery);
    // console.log(results)

    if (!results?.length) return res.send(apiResponseBad(null));

    var p_video = "";
    var duration = 0;
    var roomid = 0;
    for (var i = 0; i < results.length; i++) {
      if (results[i].is_projector) {
        p_video = [
          encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          ),
          lang,
        ];
        roomid = results[i].room_id;
        break;
      }
    }
    var w_video = "";
    for (var i = 0; i < results.length; i++) {
      if (!results[i].is_projector) {
        w_video = [
          encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          ),
          lang,
        ];
        duration = results[i].duration;
        roomid = results[i].room_id;
        break;
      }
    }
    if (roomid !== process.env.WS_ID) {
      clearIntervals();
    }
    LogToConsole("Projector: " + JSON.stringify(p_video));
    LogToConsole("Video Wall: " + JSON.stringify(w_video));
    if (roomid == process.env.WS_ID) {
      io.emit("change_video_zone_wsw", w_video);
      io.emit("change_video_zone_wsp", p_video);
    } else {
      io.emit("change_video_zone_dw", w_video);
      io.emit("change_video_zone_dp", p_video);
    }
    return res.send(apiResponse(duration));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/play_pres/:slide_num", async (req, res) => {
  let lang = "en";
  let roomid = req.params.id;
  let slide_num = req.params.slide_num;
  LogToConsole("Room ID: " + roomid + ", Slide Number: " + slide_num);
  try {
    const pp_image_path = [
      encodeURI(
        (process.env.APP_ENV === "prod"
          ? process.env.PROD_PP_IMG_PATH
          : process.env.LOCAL_PP_IMG_PATH) +
          "screen-" +
          slide_num +
          "-led.jpg"
      ),
      lang,
    ];
    LogToConsole(JSON.stringify(pp_image_path));
    if (roomid == process.env.WS_ID) {
      io.emit("change_video_zone_wsw", pp_image_path);
    } else {
      io.emit("change_video_zone_dw", pp_image_path);
    }
    res.send({ status: "success", message: "Slide Updated on Video Walls" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

function clearIntervals() {
  clearInterval(timeInterval);
  videoPlayed = 0;
  // videoInterval = {};
  // console.log("Model Intervals cleared");
  // LogToConsole("Model Intervals cleared");
}

async function playDefaultScene(roomId, lang, isExecCommand) {
  var _roomId = 0;
  var _lang = "en";
  let _wsp_video = "",
    _wsw_video = "",
    _dp_video = "",
    _dw_video = "";
  if (roomId) _roomId = roomId;
  if (lang) _lang = lang;

  // LogToConsole((_roomId > 0 && _roomId !== process.env.WS_ID) + ':' + _roomId + ':' + _lang + ':' + isExecCommand)

  // if (_roomId > 0 && _roomId !== process.env.WS_ID) {
  clearIntervals();
  // }

  if (process.env.APP_ENV == "prod" && isExecCommand) {
    let cmdQuery =
      "SELECT c.name, (SELECT delay FROM settings WHERE id = 1) AS delay, h.device FROM `commands` AS c INNER JOIN hardware AS h ON h.id = c.hardware_id INNER JOIN command_scene AS cs ON cs.command_id = c.id INNER JOIN scenes AS s ON s.id = cs.scene_id WHERE " +
      (_roomId != 0 ? "s.room_id = " + _roomId + " AND " : "") +
      " s.is_default = 1 ORDER BY cs.sort_order ASC;";
    try {
      const [results] = await pool.query(cmdQuery);
      // console.log(results)

      if (!results?.length) return res.send(apiResponseBad(null));

      var execCommands = async () => {
        await sendCrestCommands(results);
      };
      execCommands();
    } catch (err) {
      return res.send(apiResponseBad(err));
    }
  }

  let sqlQuery =
    "SELECT m.name, m.room_id, m.is_projector, m.is_image, m.duration FROM media AS m INNER JOIN scenes AS s ON m.scene_id = s.id WHERE " +
    (_roomId != 0 ? "s.room_id = " + _roomId + " AND " : "") +
    " s.is_default = 1 AND m.lang = 'en' ORDER BY m.id DESC;";
  try {
    const [results] = await pool.query(sqlQuery);
    // console.log(results)

    if (!results?.length) return res.send(apiResponseBad(null));
    for (var i = 0; i < results.length; i++) {
      if (results[i].room_id == process.env.WS_ID) {
        if (results[i].is_projector && _wsp_video == "")
          _wsp_video = encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          );
        else if (_wsw_video == "")
          _wsw_video = encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          );
      } else {
        if (results[i].is_projector && _dp_video == "")
          _dp_video = encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          );
        else if (_dw_video == "")
          _dw_video = encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          );
      }
    }
    // return _roomId;
    if (_roomId == 0) {
      io.emit("change_default_video_wsw", _wsw_video);
      io.emit("change_default_video_wsp", _wsp_video);
      io.emit("change_default_video_dw", _dw_video);
      io.emit("change_default_video_dp", _dp_video);
      return true;
    } else if (_roomId == process.env.WS_ID) {
      io.emit("change_default_video_wsw", _wsw_video);
      io.emit("change_default_video_wsp", _wsp_video);
      return true;
    } else {
      io.emit("change_default_video_dw", _dw_video);
      io.emit("change_default_video_dp", _dp_video);
      return true;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

function LogToConsole(msg) {
  var dt = dateTime.create();
  var formatted = dt.format("Y-m-d H:M:S:N");
  console.log(formatted + ": " + msg);
}

app.post("/api/play_default", (req, res) => {
  let lang = "en";
  let roomId = 0;
  if (
    !(req.body.constructor === Object && Object.keys(req.body).length === 0)
  ) {
    if (req.body.lang != null && req.body.lang != "") lang = req.body.lang;
    if (req.body.roomId != null && req.body.roomId != "")
      roomId = req.body.roomId;
  }
  try {
    if (playDefaultScene(roomId, lang, 1)) {
      LogToConsole("default scene command sent successfully");
      return res.send(apiResponse("Default Scene command sent successfully"));
    }
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/get_play_wall_video", async (req, res) => {
  let sqlQuery =
    "SELECT id, title_en as title FROM `wall_media` WHERE room_id = " +
    req.params.id;

  try {
    let [results] = await pool.query(sqlQuery);
    if (!results?.length) return res.send(apiResponseBad(null));
    return res.send(apiResponse(results));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/room/:id/get_play_wall_video/ar", async (req, res) => {
  let sqlQuery =
    "SELECT id, title_ar as title FROM `wall_media` WHERE room_id = " +
    req.params.id;

  try {
    let [results] = await pool.query(sqlQuery);
    if (!results?.length) return res.send(apiResponseBad(null));
    return res.send(apiResponse(results));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/play_wall_video/:id", async (req, res) => {
  let sqlQuery =
    "SELECT id, name, room_id, duration FROM `wall_media` WHERE id = " +
    req.params.id;

  try {
    let [results] = await pool.query(sqlQuery);
    if (!results?.length) return res.send(apiResponseBad(null));

    var w_video = "";
    var duration = 0;
    var roomid = 0;
    for (var i = 0; i < results.length; i++) {
      if (!results[i].is_projector) {
        w_video = [
          encodeURI(
            (process.env.APP_ENV === "prod"
              ? process.env.PROD_VIDEO_PATH
              : process.env.LOCAL_VIDEO_PATH) + results[i].name
          ),
          "en",
        ];
        duration = results[i].duration;
        roomid = results[i].room_id;
        break;
      }
    }
    if (roomid !== process.env.WS_ID) {
      clearInterval(timeInterval);
      videoPlayed = 0;
      LogToConsole("Model Intervals cleared");
    }
    // return res.send(apiResponse(roomid));
    if (roomid == process.env.WS_ID) {
      io.emit("change_video_wsw", w_video);
    } else {
      io.emit("change_video_dw", w_video);
    }
    return res.send(apiResponse(duration + 2));
  } catch (err) {
    return res.send(apiResponseBad(err));
  }
});

app.get("/api/test", (req, res) => {
  const child_argv = ["test", "test2"];

  //let child = child_process.fork(child_script_path, child_argv)
  var r;
  child_argv.forEach(function (item) {
    r = crestSocket.write(item);
    LogToConsole("Command sent to crestron with status: " + r);
  });
  return res.send(apiResponseBad(null));
});

function apiResponse(results) {
  return { status: 200, error: null, response: results };
}

function apiResponseBad(results) {
  return { status: 500, error: true, response: results };
}

server.listen(process.env.APP_PORT, () => {
  LogToConsole("App Server started on port " + server.address().port);
});

crestServer.listen(process.env.CREST_PORT, () => {
  LogToConsole("Crestron Server started on port " + crestServer.address().port);
});

modelServer.listen(process.env.MODEL_PORT, () => {
  LogToConsole("Model server started on port " + modelServer.address().port);
});
