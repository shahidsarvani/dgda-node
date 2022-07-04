const net = require('net');
var server = net.createServer();

// app.use(bodyParser.json());


server.listen(58900, () => {
    console.log('opened server on %j:%k',server.address().address, server.address().port);
});


var socket = server.on("connection", (socket) => {
    console.log("Client connection details - ", socket.remoteAddress + ":" + socket.remotePort);
    socket.setKeepAlive(true); // to keep the status connected with crestron
    var res = socket.write('test from Anees');
    console.log(res);
    socket.close();
    // var res2 = socket.write('test 2 from Anees');
    // console.log(res2);
});

// setTimeout(function() {
//     console.log(gSocket.remoteAddress + ":" + gSocket.remotePort);
//     var res2 = gSocket.write('test 2 from Anees');
//     console.log(res2);
// }, 30000)

