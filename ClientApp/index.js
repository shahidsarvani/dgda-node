require("dotenv").config();
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const url = `http://${SERVER_HOST}:${SERVER_PORT}`;
var VLC = require("vlc-simple-player");
const { io } = require("socket.io-client");
let player;
let volume = 0;
let prev_volume = 0;
let is_muted = 0;
// let do_empty = 1;

var basePlaylistID = 3;
// var defaultVideo = '';

const socket = io(url, {
  query: {
    room_id: process.env.ROOM_ID,
    is_projector: process.env.IS_PROJECTOR,
  },
});

socket.on(process.env.CHANGE_DEFAULT_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg);
    // defaultVideo = msg
    default_play_video(msg);
  }
});
socket.on(process.env.CHANGE_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg);
    change_video(msg);
  }
});
// socket.on(process.env.CHANGE_ZONE_VIDEO_EVENT, (msg) => {
//   if (msg && msg.length) {
//     console.log(msg);
//     change_zone_video(msg);
//   }
// });

socket.on(process.env.CHANGE_ZONE_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log("Slide change received:", msg);
    change_zone_video(msg);
  }
});

function getDefaultArgs() {
  options = process.env.VLCCOMMANDS.split(",");
  const search = ";";
  const replacer = new RegExp(search, "g");
  var args = [];
  options.forEach((option) => {
    args.push(option.replace(replacer, ","));
  });
  var defaultArguments = {
    arguments: args,
  };
  // console.log(defaultArguments.arguments);
  return defaultArguments;
}

function default_play_video(msg) {
  console.log("default");
  if (!player) player = new VLC(msg, getDefaultArgs());
  else addItem(msg);

  if (process.env.IS_PROJECTOR == 0) {
    player.on("statuschange", (error, status) => {
      // console.log(status)
      if (status) {
        volume = status.volume;
      }
    });
  }
}

function addItem(videoName) {
  player.request("/requests/status.json?command=pl_empty", () => {});
  player.request(
    "/requests/status.json?command=in_enqueue&input=" + encodeURI(videoName),
    () => {}
  );
  console.log(basePlaylistID);
  player.request(
    "/requests/status.json?command=pl_delete&id=" + basePlaylistID,
    () => {}
  );
  player.request(
    "/requests/status.json?command=pl_play&id=" + basePlaylistID++,
    () => {}
  );
}

// function play_video(video) {
//   console.log(video);
//   player = new VLC(video[0].toString(), getDefaultArgs());
//   if (process.env.IS_PROJECTOR == 0) {
//     player.on("statuschange", (error, status) => {
//       console.log(status);
//       volume = status.volume;
//       if (error) return console.error(error);
//       console.log("Times: " + (status.time + 1) + "/" + status.length);
//       if (status.time == status.length - 1) {
//         console.log("time completed");
//         socket.emit("default_video", {
//           room_id: process.env.ROOM_ID,
//           lang: video[1],
//         });
//       }
//     });
//   }
// }
function play_video(video) {
  const [videoPath, lang] = video;
  const duration = 1800; // Set duration to 1800 seconds (30 minutes)
  const args = getDefaultArgs();
  args.arguments.push(`--image-duration=${duration}`);
  player = new VLC(videoPath, args);

  player.on("statuschange", (error, status) => {
    if (error) return console.error(error);
    if (status.time == status.length - 1) {
      console.log("Slide duration ended, sending event to server");
      socket.emit("default_video", { room_id: process.env.ROOM_ID, lang });
    }
  });
}

function change_video(video) {
  console.log("change video");
  console.log(video);
  // do_empty = 1
  if (!player) {
    console.log("new video");
    play_video(video);
  } else {
    console.log("running video");

    addItem(video[0]);

    if (process.env.IS_PROJECTOR == 0) {
      player.on("statuschange", (error, status) => {
        // console.log(status)
        volume = status.volume;
        if (error) return console.error(error);
        console.log("meow");
        console.log("Times: " + (status.time + 1) + "/" + status.length);
        if (status.time == status.length - 1) {
          console.log("time completed");
          socket.emit("default_video", {
            room_id: process.env.ROOM_ID,
            lang: video[1],
          });
        }
      });
    }
  }
}

// function change_zone_video(video) {
//   console.log("change zone video");
//   console.log(video);
//   if (!player) {
//     console.log("new zone video");
//     play_video(video);
//   } else {
//     console.log("running zone video");
//     addItem(video[0]);
//   }
// }

function change_zone_video(video) {
  if (!player) {
    console.log("Initializing VLC player with slide:", video[0]);
    play_video(video);
  } else {
    console.log("Updating VLC player with new slide:", video[0]);
    addItem(video[0]);
  }
}

socket.on(process.env.VIDEO_EVENTS, (msg) => {
  console.log(msg);
  // console.log(msg[1])
  // // return;
  // var volume = 0
  // if (typeof msg == 'object') {
  //   volume = msg[1]
  //   msg = msg[0]
  // }
  switch (msg) {
    case "play":
      if (player)
        player.request("/requests/status.json?command=pl_pause", () => {});
      break;
    case "pause":
      if (player)
        player.request("/requests/status.json?command=pl_pause", () => {});
      break;
    case "forward":
      if (player)
        player.request("/requests/status.json?command=seek&val=+10s", () => {});
      break;
    case "back":
      if (player)
        player.request("/requests/status.json?command=seek&val=-10s", () => {});
      break;
    case "stop":
      if (player)
        player.request("/requests/status.json?command=pl_stop", () => {});
      socket.emit("default_video", {
        room_id: process.env.ROOM_ID,
        lang: "en",
      });
      break;
    case "up":
      console.log("volume up command received");
      if (process.env.IS_PROJECTOR == 0) {
        console.log("volume up command received");
        volume += 20;
        console.log(volume);
        if (player)
          player.request(
            "/requests/status.json?command=volume&val=" + volume,
            () => {}
          );
      }
      break;
    case "down":
      if (process.env.IS_PROJECTOR == 0) {
        console.log("volume down command received");
        volume -= 20;
        console.log(volume);
        if (player)
          player.request(
            "/requests/status.json?command=volume&val=" + volume,
            () => {}
          );
      }
      break;
    case "mute":
      if (process.env.IS_PROJECTOR == 0) {
        console.log(is_muted);
        if (is_muted == 1) {
          volume = prev_volume;
          is_muted = 0;
        } else {
          prev_volume = volume;
          volume = 0;
          is_muted = 1;
        }
        console.log(prev_volume);
        console.log(volume);
        if (player)
          player.request(
            "/requests/status.json?command=volume&val=" + volume,
            () => {}
          );
      }
      break;
    // case "unmute":
    //   if (process.env.IS_PROJECTOR == 0) {
    //     volume = prev_volume
    //     console.log(prev_volume)
    //     console.log(volume)
    //     if (player) player.request('/requests/status.json?command=volume&val=' + volume, () => { })
    //   }
    //   break;
    default:
      console.log("Error!");
      break;
  }
});

// client.on('change_video_wsw', (data) => {
//   console.log(data)
//   play_video(data)
// })

// // Add a 'close' event handler for the client socket
// client.on('close', () => {
//   console.log('Client closed');
// });

// client.on('error', (err) => {
//   console.error(err);
// });
