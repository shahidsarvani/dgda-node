var net = require('net');
require('dotenv').config();
const HOST = process.env.Server;
const PORT = process.env.Port;
var client = new net.Socket();
var VLC = require('vlc-simple-player')



client.connect(PORT, HOST, () => {
  console.log(`client connected to ${HOST}:${PORT}`);
  // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
  client.write('play_default');
  // var player = new VLC(data);
});

client.on('data', (data) => {
  console.log(`Client received: ` + data);
  play_video(data);
});



function play_video(video) {
  var player = new VLC(video.toString());
  player.on('statuschange', (error, status) => {
    if (error) return console.error(error);
    // console.log('timechange', status.time);
    if (status.time === 1) console.log(status);    
  });
}

client.on('wsw_video', (data) => {
  switch (data) {
      case "play":
          player.request('/requests/status.json?command=pl_pause', () => { })
          break;
      case "pause":
          player.request('/requests/status.json?command=pl_pause', () => { })
          break;
      case "forward":
          player.request('/requests/status.json?command=seek&val=+10s', () => { })
          break;
      case "back":
          player.request('/requests/status.json?command=seek&val=-10s', () => { })
          break;
      case "stop":
          player.request('/requests/status.json?command=pl_stop', () => { })
          play_video(data)
          break;
      case "up":
          player.request('/requests/status.json?command=volume&val=+10', () => { })
          break;
      case "down":
          player.request('/requests/status.json?command=volume&val=-10', () => { })
          break;
      case "mute":
          player.request('/requests/status.json?command=volume&val=0', () => { })
          break;
      default:
          console.log('Error!')
          break;
  }
});

client.on('change_video_wsw', (data) => {
  console.log(data)
  play_video(data)
})

// Add a 'close' event handler for the client socket
client.on('close', () => {
  console.log('Client closed');
});

client.on('error', (err) => {
  console.error(err);
});