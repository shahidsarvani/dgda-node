require('dotenv').config();
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const url = `http://${SERVER_HOST}:${SERVER_PORT}`
var VLC = require('vlc-simple-player')
const { io } = require("socket.io-client");

let player;
var basePlaylistID = 3;
var defaultVideo = '';

const socket = io(url, {
  query: {
    "room_id": process.env.ROOM_ID,
    "is_projector": process.env.IS_PROJECTOR
  }
});
socket.on('connect', function (socket) {
  console.log('Connected!');
})


function playDefaultVideo() {
  if (!player) player = new VLC(defaultVideo);
  else addItem(defaultVideo);
}

socket.on(process.env.CHANGE_DEFAULT_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg)
    defaultVideo = encodeURI(msg)
    playDefaultVideo();
    // default_play_video(msg)
  }
})

function addItem(videoName) {
  player.request('/requests/status.json?command=in_enqueue&input=' + videoName, () => { });
  player.request('/requests/status.json?command=pl_delete&id=' + basePlaylistID, () => { });
  player.request('/requests/status.json?command=pl_play&id=' + (basePlaylistID++), () => { });
}

if (player) {
  player.on('statuschange', (error, status) => {
    if (error) return console.error(error);

    console.log('timechange: ' + status.time + '/' + status.length);
    if (status.information)
      if (status.information.category.meta.filename != defaultVideo && (status.time + 1) === status.length) {
        addItem(defaultVideo);
      }
  });

}

socket.on(process.env.CHANGE_VIDEO_EVENT, (msg) => {
  if (msg && msg.length) {
    console.log(msg)
    change_video(msg)
  }
})

function getDefaultArgs() {
  options = process.env.VLCCOMMANDS.split(',');
  const search = ';';
  const replacer = new RegExp(search, 'g')
  var args = [];
  options.forEach((option) => {
    args.push(option.replace(replacer, ','));
  })
  var defaultArguments = {
    "arguments": args
  };
  // console.log(defaultArguments.arguments);
  return defaultArguments;
}

function default_play_video(video) {
  console.log('default')
  if (!player) {
    player = new VLC(video.toString(), getDefaultArgs());
  } else {
    player.request('/requests/status.json?command=pl_empty', () => {
      console.log('default empty list');
      player.request('/requests/status.json?command=in_play&input=' + encodeURI(video.toString()), () => { });
    });
  }
}

function play_video(video) {
  console.log(video)
  player = new VLC(video[0].toString(), getDefaultArgs());
  if (process.env.IS_PROJECTOR == 0) {
    player.on('statuschange', (error, status) => {
      if (error) return console.error(error);
      console.log('Times: ' + (status.time + 1) + '/' + status.length);
      if (status.time + 1 == status.length) {
        console.log('time completed');
        socket.emit('default_video', {
          "room_id": process.env.ROOM_ID,
          "lang": video[1]
        })
      }
    });
  }
}

function change_video(video) {
  console.log('change video')
  console.log(video)
  if (!player) {
    console.log('new video')
    play_video(video)
  } else {
    console.log('running video')
    addItem(encodeURI(video[0].toString()))
    // player.request('/requests/status.json?command=in_play&input=' + encodeURI(video[0].toString()), () => {
    //   console.log('video played')
    //   player.request('/requests/status.json?command=command=pl_delete&id=3', () => {
    //     console.log('prev video deleted')
    //   });
    // });

    // player.request('/requests/status.json?command=pl_empty', () => {
    //   console.log('change empty list');
    //   player.request('/requests/status.json?command=in_play&input=' + encodeURI(video[0].toString()), () => { });
    // });
    if (process.env.IS_PROJECTOR == 0) {
      player.on('statuschange', (error, status) => {
        if (error) return console.error(error);
        console.log('Times: ' + (status.time + 1) + '/' + status.length);
        if (status.time + 1 == status.length) {
          console.log('time completed');
          socket.emit('default_video', {
            "room_id": process.env.ROOM_ID,
            "lang": video[1]
          })
        }
      });
    }
  }
}

socket.on(process.env.VIDEO_EVENTS, (msg) => {
  console.log(msg)
  console.log(msg[1])
  // return;
  var volume = 0
  if (typeof msg == 'object') {
    volume = msg[1]
    msg = msg[0]
  }
  switch (msg) {
    case "play":
      addItem('sampleVideos/' + msg);
      // if (player) player.request('/requests/status.json?command=pl_pause', () => { })
      break;
    case "pause":
      if (player) player.request('/requests/status.json?command=pl_pause', () => { })
      break;
    case "forward":
      if (player) player.request('/requests/status.json?command=seek&val=+10s', () => { })
      break;
    case "back":
      if (player) player.request('/requests/status.json?command=seek&val=-10s', () => { })
      break;
    case "stop":
      if (player) player.request('/requests/status.json?command=pl_stop', () => { })
      socket.emit('default_video', {
        "room_id": process.env.ROOM_ID,
        "lang": 'en'
      })
      break;
    case "up":
      console.log('volume up command received');
      if (process.env.IS_PROJECTOR == 0) {
        console.log('volume up command received');
        if (player) player.request('/requests/status.json?command=volume&val=+10', () => { })
      }
      break;
    case "down":
      if (process.env.IS_PROJECTOR == 0) {
        console.log('volume down command received');
        if (player) player.request('/requests/status.json?command=volume&val=-10', () => { })
      }
      break;
    case "mute":
      if (process.env.IS_PROJECTOR == 0) {
        console.log(msg)
        console.log(volume)
        if (player) player.request('/requests/status.json?command=volume&val=' + volume, () => { })
      }
      break;
    case "unmute":
      if (process.env.IS_PROJECTOR == 0) {
        console.log(msg)
        console.log(volume)
        if (player) player.request('/requests/status.json?command=volume&val=' + volume, () => { })
      }
      break;
    default:
      console.log('Error!')
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