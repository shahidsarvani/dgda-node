const net = require('net');
var server = net.createServer();

server.listen(58900, () => {
    console.log('opened server on %j', server.address().port);
});

server.on("connection", (socket) => {
    console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    socket.setKeepAlive(true); // to keep the status connected with crestron\
    var res;
    process.argv.forEach(function (val, index, array) {
      // console.log(index, val)
      if(index>1)
      {
        res = socket.write(val);
        console.log(res);
      }
    });
    console.log("about to end");
    socket.destroy();
    server.close();
});

