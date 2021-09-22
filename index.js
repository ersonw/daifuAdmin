const express = require('express');
const app = express();
const webSocket = require('./websocket');
const hrv       = require('http').Server(app);
const c = require('child_process');
const { resolve } = require('path');
const session = require("express-session");
const config = require('./config');
const functions = require('./functions');
const NedbStore = require('nedb-session-store')(session);
const sessionMiddleware = session({
    secret: "fas fas",
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: false,
        maxAge: 365 * 24 * 60 * 60 * 1000   // e.g. 1 year
    },
    store: new NedbStore({
        filename: 'path_to_nedb_persistence_file.db'
    })
});
const bodyParser = require('body-parser');
const fs = require("fs");

(async () => {
    await config.initConfig();
    const TeleApi = require('./teleapi');
    const verify = await functions.verifyServer();
    if (verify === false){
        if (process.cwd() !== __dirname){
            await functions.outputDir('/public');
            await functions.outputDir('/img');
            await functions.outputDir('/log');
        }
        await TeleApi.run();
        const server = await config.getServer();
        webSocket.run(hrv);
        hrv.listen(server.port, () => {
            console.log(`http://${server.ip}:${server.port} \n ws://${server.ip}:${server.port}`);
            c.exec(`start http://${server.ip}:${server.port}`);
        });
    }else {
        console.log(`此机器尚未获取到授权，请复制以下机器码去所打开的页面获取授权\n${verify}`);
        // c.exec(`start http://localhost:${listenPort}`);
    }
})()

app.all('*', function (req, res, next) {
    //  允许应用的跨域访问
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested, yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.send(200);
    } else {
        next();
    }
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(sessionMiddleware);
// app.use('/', express.static(__dirname+'/public', {
//     maxAge: 60 * 1000  // 一分钟缓存
// }));
app.use('/', express.static(process.cwd()+'/public', {
    maxAge: 60 * 1000  // 一分钟缓存
}));
app.use('/', express.static(process.cwd()+'/img', {
    maxAge: 60 * 1000 * 60 * 24 * 365  // 一年缓存
}));
app.use('/api', require('./routes/api'));
app.get('/NORDestB', (req,res) =>{
    res.sendFile(__dirname+'/temp/photo_2021-07-28_05-17-05.jpg');
});
app.use(function (req, res, next) {
    res.status(404).send(fs.readFileSync(__dirname+'/temp/404.html', "utf8"));
});
//  捕获并下发错误码， 必须放在最后
app.use(async (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error Code: 500');
});
//  Uncaught exception handle
process.on('uncaughtException', function (err) {
    console.error('Caught exception: ' + err.stack);
});
process.on('UnhandledPromiseRejectionWarning', function (err) {
    console.error('Unhandled Promise Rejection Warning: ' + err.stack);
});
