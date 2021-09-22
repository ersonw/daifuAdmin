const CWebSocket    = require('ws');
const url           = require('url');
const Session       = require('./session');
const functions     = require('./functions');

class webSocket {
    //  构造
    constructor() {
        this.server         = null;
        this.sleepMSecond   = 30000;
        this.users          = new Map();
        this.uiBeginId      = 10000;
        this.mapUserSocket  = new Map();
        this.inMessage        = new Map();
        this.outMessage        = new Map();
    }
    run(httpServer){
        let self = this;
        let wSocket = this.server = new CWebSocket.Server({
            server  : httpServer,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize   : 1024,
                    memLevel    : 7,
                    level       : 3,
                },
                zlibInflateOptions: {
                    chunkSize   : 10 * 1024
                },
                clientNoContextTakeover : true,
                serverNoContextTakeover : true,
                clientMaxWindowBits     : 10,
                serverMaxWindowBits     : 10,
                concurrencyLimit        : 10,
                threshold               : 1024,
            }});
        wSocket.broadcast = function broadcast(data) {
            wSocket.clients.forEach(function each(client) {
                if (client.readyState === CWebSocket.OPEN && !client.bFucked) {
                    client.send(data, function ack(err) {
                        if (err) {
                            client.bFucked = true;
                        }
                    });
                }
            });
        };
        let heartBeat = function() {
            this.isAlive = true;
        };
        let pull = setInterval(async () => {
            const orders = await functions.getNewOrders();
            for await (const v of orders){
                self.inMessage.set(v.id, {id: v.id, message: `您有最新入款订单！订单号为：${v.oid}`});
            }
            for await (const v of self.inMessage){
                let t = false;
                for await (const vv of orders){
                    if (vv.id === v[0]){
                        t = true;
                    }
                }
                if (t === false){
                    self.inMessage.delete(v[0]);
                }
            }
            const out = await functions.getNewOut();
            for await (const v of out){
                self.outMessage.set(v.id, {id: v.id, message: `您有最新下发订单！出款金额：￥${(parseInt(v.amount) / 100).toFixed(2)}`});
            }
            for await (const v of self.outMessage){
                let t = false;
                for await (const vv of out){
                    if (vv.id === v[0]){
                        t = true;
                    }
                }
                if (t === false){
                    self.outMessage.delete(v[0]);
                }
            }
        }, 1000 * 15);
        wSocket.on('connection', function connection(ws, req) {
            ws.isAlive = true;
            //  心跳处理
            ws.on('pong', heartBeat);

            //  进行用户管理
            ++self.uiBeginId;
            //
            //
            ws.userId = self.uiBeginId;
            ws.auth = false;
            const location = url.parse(req.url, true);
            const ip = req.connection.remoteAddress;
            ws.ip = ip;
            self.mapUserSocket.set(self.uiBeginId, ws);
            ws.on('open', function open() {
                console.log('connected');
            });
            //  关闭连接
            ws.on('close', function close() {
                // console.log(`disconnected WS ID: ${ws.userId}`);
                self.mapUserSocket.delete(ws.userId);
                self.users.delete(ws.userId);
            });
            ws.on('message',(e) => {
                const message = JSON.parse(`${e}`);
                setTimeout(function timeout() {
                    ws.send(Date.now());
                }, 500);
                if (message){
                    // console.log(message);
                }
                switch (message.action) {
                    case 'auth':
                        self.userAuth(ws.userId, message.token);
                        break;
                    case 'getMessage':
                        self.getMessage(ws.userId);
                        break;
                    default:
                        break;
                }
            });
        });
    }
    getMessage(userId) {
        const self = this;
        let interval = setInterval(async () => {
            if (self.users.has(userId)){
                const itemIn = [];
                let data = {};
                for await (const v of this.inMessage){
                    itemIn.push(v[1]);
                }
                data.inMessage = itemIn;
                const itemOut = [];
                for await (const v of this.outMessage){
                    itemOut.push(v[1]);
                }
                data.outMessage = itemOut;
                // if (itemIn.length > 0 || itemOut.length > 0){
                    self.Send(userId, { action: 'getMessage', data: data });
                // }
            }else {
                clearInterval(interval);
            }
        }, 1000 * 5);
    }
    async userAuth(userId ,token){
        const user = await Session.getUserBySid(token);
        // console.log(user);
        if (user === false){
            this.Disconnect(userId);
            return ;
        }
        // await this.delUserByToken(token);
        let userMap = this.mapUserSocket.get(userId);
        userMap.auth = true;
        // await this.delUserByUid(user.uid);
        this.users.set(userId, user);
        this.mapUserSocket.set(userId, userMap);
        this.Send(userId, { action: 'auth', response: true });
    }
    async delUserByUid(uid){
        for await (const v of this.users){
            // console.log(v[1]);
            if (v[1].uid === uid){
                this.Disconnect(v[0]);
            }
        }
    }
    Send(userId, msg) {
        if (!this.server) {
            return ;
        }
        const ws = this.mapUserSocket.get(userId);
        if (!ws) {
            return ;
        }
        if (!this.server.clients.has(ws)) {
            return ;
        }
        if (ws.readyState !== CWebSocket.OPEN) {
            return ;
        }
        try {
            const msgStr = JSON.stringify(msg);
            ws.send(msgStr, function ack(err) {
                if (err) {
                    console.log('[err] send msg:[' + JSON.stringify(msg) + '] e:' + err + ']');
                }

            });
        } catch (e) {
            console.log('[err] send msg:[' + JSON.stringify(msg) + ']');
        }
    }
    GetUserIP(userId) {
        if (!this.server) {
            return ;
        }
        const ws = this.mapUserSocket.get(userId);
        if (!ws) {
            return ;
        }
        if (ws.ip) {
            return ws.ip;
        }
        return '0.0.0.0';
    }
    Broadcast(msg) {
        if (!this.server) {
            return ;
        }
        try {
            this.server.broadcast(JSON.stringify(msg));
        } catch (e) {
            console.log('[err] send msg:[' + JSON.stringify(msg) + ']');
        }
    }
    Stop() {
        //  this.server.close();
    }
    GetCount() {
        return this.server.client.size;
    }
}
let InstWebSocket = new webSocket();
exports = module.exports = InstWebSocket;
