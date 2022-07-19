
require('dotenv').config();
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const url = `http://${SERVER_HOST}:${SERVER_PORT}`
var VLC = require('vlc-simple-player')
const { io } = require("socket.io-client");
let player;

const socket = io(url, {
  query: {
    "room_id": "1",
    "is_projector": "1"
  }
});
socket.on('connect', function (socket) {
  console.log('Connected!');
})
socket.on('change_default_video_wsp', (msg) => {
  if (msg && msg.length) {
    play_video(msg)
  }
})
socket.on('change_video_wsp', (msg) => {
  if (msg && msg.length) {
    change_video(msg)
  }
})



function play_video(video) {
  player = new VLC(video.toString());
  // player.on('statuschange', (error, status) => {
  //   if (error) return console.error(error);
  //   // console.log('timechange', status.time);
  //   if (status.time === 1) console.log(status);
  // });
}

function change_video(video) {
  if(!player) {
    play_video(video)
  } else {
    player.request('/requests/status.json?command=in_play&input=' + encodeURI(video.toString()), () => { })
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