
require('dotenv').config();
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const url = `http://${SERVER_HOST}:${SERVER_PORT}`
var VLC = require('vlc-simple-player')
const { io } = require("socket.io-client");
let player;

const socket = io(url, {
  query: {
    "room_id": process.env.ROOM_ID,
    "is_projector": process.env.IS_PROJECTOR
  }
});
socket.on('connect', function (socket) {
  console.log('Connected!');
})
socket.on(process.env.CHANGE_DEFAULT_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg)
    default_play_video(msg)
  }
})
socket.on(process.env.CHANGE_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg)
    change_video(msg)
  }
})


function default_play_video(video) {
  if (!player) {
    player = new VLC(video.toString());
  } else {
    player.request('/requests/status.json?command=pl_empty', () => { });
    player.request('/requests/status.json?command=in_play&input=' + encodeURI(video.toString()), () => { })
  }
}

function play_video(video) {
  player = new VLC(video[0].toString());
  player.on('statuschange', (error, status) => {
    if (error) return console.error(error);
    console.log('current Time', status.time);
    console.log('totall Time', status.length);
    if (status.time + 1 === status.length)
      socket.emit('default_video', {
        "room_id": process.env.ROOM_ID,
        // "is_projector": process.env.IS_PROJECTOR,
        "lang": video[1]
      })
  });
}

function change_video(video) {
  if (!player) {
    play_video(video)
  } else {
    player.request('/requests/status.json?command=pl_empty', () => { });
    player.request('/requests/status.json?command=in_play&input=' + encodeURI(video[0].toString()), () => { })
    player.on('statuschange', (error, status) => {
      if (error) return console.error(error);
      console.log('current Time', status.time);
      console.log('totall Time', status.length);
      if (status.time + 1 === status.length)
        socket.emit('default_video', {
          "room_id": process.env.ROOM_ID,
          // "is_projector": process.env.IS_PROJECTOR,
          "lang": video[1]
        })
    });
  }
}

// client.on('wsw_video', (data) => {
//   switch (data) {
//     case "play":
//       player.request('/requests/status.json?command=pl_pause', () => { })
//       break;
//     case "pause":
//       player.request('/requests/status.json?command=pl_pause', () => { })
//       break;
//     case "forward":
//       player.request('/requests/status.json?command=seek&val=+10s', () => { })
//       break;
//     case "back":
//       player.request('/requests/status.json?command=seek&val=-10s', () => { })
//       break;
//     case "stop":
//       player.request('/requests/status.json?command=pl_stop', () => { })
//       play_video(data)
//       break;
//     case "up":
//       player.request('/requests/status.json?command=volume&val=+10', () => { })
//       break;
//     case "down":
//       player.request('/requests/status.json?command=volume&val=-10', () => { })
//       break;
//     case "mute":
//       player.request('/requests/status.json?command=volume&val=0', () => { })
//       break;
//     default:
//       console.log('Error!')
//       break;
//   }
// });

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