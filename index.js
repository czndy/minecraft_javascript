const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
const net = require('net');
const {spawn} = require("child_process");
const { v4: uuidv4} = require('uuid');
// Gera um id único para cada execução
const runId = uuidv4();
console.log("uuid",runId);

let logs = [];
var minecraftServer = {};

app.use(express.json());
app.use(cors());

app.get('/getLogs/:secret?', (req, res) => {
    let secret = req.params?.secret;
    if(auth(secret, runId)){
        res.send(logs.join('<br>'));
    }else{
        res.send({message: 'Sai daqui'});
    }
});

app.get('/serverRunning/:secret?', (req, res) => {
    let secret = req.params?.secret;
    if(auth(secret, runId)){
        checkServer("0.0.0.0", 25565, (status)=>{
            res.send(status.toString());
        });
    }else{
        res.send({message: 'Sai daqui'});
    }
});

app.get('/startServer/:secret?', (req, res) => {
    let secret = req.params?.secret;
    if(auth(secret, runId)){
        logs = [];
        server();
        res.send({message: 'Starting server...'});
    }else{
        res.send({message: 'Sai daqui'});
    }
});

app.get('/stopServer/:secret?', (req, res) => {
    let secret = req.params?.secret;
    if(auth(secret, runId)){
        minecraftServer.stdin.write("stop \n");
        res.send({message: 'Stopping server...'});
    }else{
        res.send({message: 'Sai daqui'});
    }
});

app.get('/sendCommand/:secret?/:command?', (req, res) => {

    let secret = req.params?.secret;
    let command = req.params?.command;
    console.log("SERVER COMMAND",command.toString());
    if(auth(secret, runId)){
        minecraftServer.stdin.write(`${command.toString()} \n`);
        res.send({message:"Executando seu comando: "+command.toString()});
    }else{
        res.send({message: 'Sai daqui'});
    }
    
});


// app.post('/sendCommand', (req, res) => {
//     console.log("req.body: ",req.body);
//     if(req.body?.command){
//         minecraftServer.stdin.write(`${req.body?.command} \n`);
//         res.send({message:"Executando seu comando: "+req.body?.command});
//     }else{
//         res.send({message: "Favor seguir o padrão de JSON..."});
//     }
// });

function auth(secret, runId){
    if(secret.toString() === runId.toString()){
        return true;
    }else{
        return false;
    }
}

function checkServer(host, port, callback) {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      console.log(`Server is running on port ${port}!`);
      socket.destroy();
      callback(200);
    });
    socket.on('timeout', () => {
      console.log(`Server is not running on port ${port}.`);
      socket.destroy();
      callback(404);
    });
    socket.on('error', (err) => {
      console.log(`Server is not running on port ${port}.`);
      // console.log(`Error: ${err.message}`);
      socket.destroy();
      callback(500);
    });
    socket.connect(port, host);
  }

function server(){
    minecraftServer = spawn("java", ['-jar', 'spigot-1.20.1.jar', 'nogui'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    minecraftServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        if(!data.toString().toLowerCase().includes('guico')
        && !data.toString().toLowerCase().includes('logged')
        && !data.toString().toLowerCase().includes('uuid')
        && !data.toString().toLowerCase().includes('disconnect')
        && !data.toString().toLowerCase().includes('connect')
        && !data.toString().toLowerCase().includes('gameprofile')){
            logs.push(data);
        }
    });

    minecraftServer.stderr.on('data', (data) => {
        console.log(`Error: ${data}`);
    });

    minecraftServer.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

app.listen(port, () => {
    console.log(`Minecraft Server Orchestrator running on port: ${port}`);
});