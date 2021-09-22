const query =require('./dbs');
const {NewMessage} = require("telegram/events");
const {Api} = require("telegram");
const {StringSession} = require("telegram/sessions");
const {TelegramClient} = require("telegram");
const TeleBot = require('telebot');
const  downloadFileAsync  = require('./downloads');
const input = require('input');
const {sleep} = require("telegram/Helpers");
const deleteFile = require('./delete');
const functions = require('./functions');
const config = require('./config');

const path = process.cwd()+'/img/';
let apiId = 0;
let apiHash = '';
let client;
let bot;
let botAuthToken = '';
let username = '';
let uuid = '';

class TeleApi{
    constructor() {
        this.lisent = new Map();
    }
    async setBotCommands(){
        await client.start({
            botAuthToken
        });
        try {
            const result = await client.invoke(new Api.bots.SetBotCommands({
                scope: new Api.BotCommandScopeUsers(),
                langCode: 'zh',
                commands:[
                    new Api.BotCommand({
                        command: 'start',
                        description: '绑定身份'
                    }),
                    new Api.BotCommand({
                        command: 'lk',
                        description: '来卡'
                    }),
                    new Api.BotCommand({
                        command: 'xf',
                        description: '下发'
                    }),
                    new Api.BotCommand({
                        command: 'cha',
                        description: '查账'
                    }),
                    // new Api.BotCommand({
                    //     command: 'statistics',
                    //     description: '统计'
                    // }),
                ]
            }));
            return  result;
        }catch (e) {
            console.log(e);
        }
    }
    getUserId(uid){
        let userId = `${uid}`;
        switch (userId.length) {
            case 1:
                userId = `Y000${uid}`
                break;
            case 2:
                userId = `Y00${uid}`
                break;
            case 3:
                userId = `Y0${uid}`
                break;
            case 4:
                userId = `Y${uid}`
                break;
        }
        return userId;
    }
    getOrdersId(id){
        const today = new Date();
        let oid = `${id + 1}`;
        let mday = today.getMonth() + 1;
        if (mday < 10){
            mday = `0${mday}`;
        }
        if (today.getDate() < 10){
            mday = `${mday}0${today.getDate()}`;
        }else {
            mday = `${mday}${today.getDate()}`;
        }
        switch (oid.length) {
            case 1:
                oid = `${mday}000${oid}`
                break;
            case 2:
                oid = `${mday}00${oid}`
                break;
            case 3:
                oid = `${mday}0${oid}`
                break;
            case 4:
                oid = `${mday}${oid}`
                break;
        }
        return oid;
    }
    async getOrders(msg){
        const orders = await query(`SELECT * FROM \`orders\` WHERE \`mid\`='${msg.message_id}' and \`chatid\`='${msg.chat.id}'`);
        return orders[0] ? orders[0] : false;
    }
    async editOrders(id ,text='',remark='' ,button =false){
        const app = await query(`SELECT * FROM \`orders\` WHERE \`id\`='${id}'`);
        if (app[0]){
            // console.log((app[0].text.split('\n\n\n'))[0])
            if (button === false){
                if (text.indexOf('已被拒绝申请，联系管理员') > -1){
                    text = `${(app[0].text.split('\n\n\n'))[0]}\n\n${text}\n${remark}`;
                }else {
                    text = `${app[0].text}\n\n${text}`;
                }
                bot.editMessageText({chatId: app[0].chatid ,messageId : app[0].mid }, text, { parseMode: 'html' }).catch(() => {});
            }else {
                this.lisent.delete(app[0].chatid);
                text = `${(app[0].text.split('\n\n\n'))[0]}\n\n\n${text}`;
                await query(`UPDATE \`orders\` SET \`text\`='${text}' WHERE \`id\`='${app[0].id}'`);
                bot.editMessageText({chatId: app[0].chatid ,messageId : app[0].mid }, text, { parseMode: 'html',replyMarkup: bot.inlineKeyboard([[bot.inlineButton('通知已付款', { callback: 'alreadyPay'})]]) }).catch(() => {});
            }
        }
    }
    async deleteMessage(id){
        const app = await query(`SELECT * FROM \`orders\` WHERE \`id\`='${id}'`);
        if (app[0]){
            await query(`DELETE FROM \`orders\` WHERE \`id\`='${id}'`);
            if (app[0].img !== null){
                const file = (app[0].img).split('/');
                deleteFile(`${path}/${file[0]}`, file[file.length-1]);
            }
            bot.deleteMessage(app[0].chatid, app[0].mid).catch(() => {});
        }
    }
    async deleteOut(out){
        await query(`DELETE FROM \`outlook\` WHERE \`id\`='${out.id}'`);
        bot.deleteMessage(out.chatid, out.mid).catch(() => {});
    }
    async editOut(out, remark, agree=false){
        let text;
        if (agree){
            text = `${out.text}\n\n\n\n处理成功，请注意查收！`;
        }else{
            const sys = await query(`SELECT * FROM \`system\` WHERE \`key\`='tgname' and \`status\`=1`);
            const TGName = sys[0] ? `\n如有疑问请<a href="https://t.me/${sys[0].value}">联系管理员</a>` : '';
            text = `${out.text}\n\n\n处理失败，暂扣的余额将自动返回！\n${TGName}\n失败理由：${remark}`;
            const user = await query(`SELECT * FROM \`user\` WHERE \`uid\`='${out.uid}'`);
            if (user[0]){
                const amount = parseInt(user[0].amount) + parseInt(out.amount);
                await query(`UPDATE \`user\` SET \`amount\`='${amount}' WHERE \`uid\`='${out.uid}'`);
            }
        }
        bot.editMessageText({chatId: out.chatid ,messageId : out.mid }, text, { parseMode: 'html' }).catch(() => {});
    }
    async authUser(msg){
        if (msg.chat.type !== 'private') return false;
        const user = msg.chat;
        // bot.deleteMessage(user.id, msg.message_id).catch(() => {});
        const userDb = await query(`SELECT * FROM \`user\` WHERE \`id\`='${user.id}'`);
        if (userDb[0] === undefined) {
            bot.sendMessage(user.id, `未绑定身份，暂时无法使用相关功能！`).then(re => {
                // console.log(re);
                setTimeout(() => {
                    bot.deleteMessage(re.chat.id, re.message_id);
                }, 1000*15);
            });
            return false;
        }
        if (userDb[0].status === 0) {
            bot.sendMessage(user.id, `此身份已进入黑名单并且已经禁止使用所有功能`).then(re => {
                // console.log(re);
                setTimeout(() => {
                    bot.deleteMessage(re.chat.id, re.message_id);
                }, 1000*15);
            });
            return false;
        }
        return userDb[0];
    }
    async checkLaiKa(id){
        const start = this.startTime(new Date().getTime());
        const end = this.endTime(new Date().getTime());
        const orders = await query(`SELECT * FROM \`orders\` WHERE \`chatid\`='${id}' AND \`status\` <> 2 AND \`status\` <> 3 AND \`status\` <> 4 and \`ctime\` > ${start} and \`ctime\` < ${end}`);
        return orders[0] ? orders[0] : false;
    }
    async handlerLaiKa(msg ,user){
        // const data = (((msg.text).replace('/lk','')).replace(/(^\s*)|(\s*$)/g, "")).split('+');
        const data = ((msg).replace('/lk','')).replace(/(^\s*)|(\s*$)/g, "");
        if (data === ''){
            return bot.sendMessage(user.id, `如需自定义请按以下示例进行发送：\n\n/lk 60000\n\n金额不低于￥50000` , { replyMarkup: bot.inlineKeyboard([
                    [
                        bot.inlineButton(`￥10000`, { callback: `lk+10000`}),
                        bot.inlineButton(`￥20000`, { callback: `lk+20000`})
                    ],
                    [
                        bot.inlineButton(`￥30000`, { callback: `lk+30000`}),
                        bot.inlineButton(`￥50000`, { callback: `lk+50000`})
                    ]
                ])});
        } else {
            const amount = parseInt(data);
            if (amount < (50000)){
                bot.sendMessage(user.id, `自定义订单金额不得少于 ￥50000 ！`).then(re => {
                    setTimeout(() => {
                        bot.deleteMessage(re.chat.id, re.message_id);
                    }, 1000*15);
                });
                return false;
            }
            await this.creatOrders(amount, user);
        }
    }
    async creatOrders(amount ,user){
        if (await this.checkLaiKa(user.id)) {
            return  bot.sendMessage(user.id, `您还有未完成订单，请先完成该订单！`).then(re => {
                setTimeout(() => {
                    bot.deleteMessage(re.chat.id, re.message_id);
                }, 1000*15);
            });
        }
        const today = new Date();
        const startDate = Math.floor((new Date(`${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()} 00:00:00`)).getTime() /1000);
        const endDate = Math.floor((new Date(`${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()} 23:59:59`)).getTime() /1000);
        const count = (await query(`select count(*) as count from \`orders\` where \`ctime\` > ${startDate} and \`ctime\` < ${endDate}`))[0].count;
        const oid = this.getOrdersId(count);
        const id = (await query(`INSERT INTO \`orders\`(\`amount\`, \`bid\`, \`uid\`, \`ctime\`, \`status\`,\`oid\`)
                                 VALUES ('${(amount * 100)}', 0, '${user.uid}','${Math.floor(today.getTime() / 1000)}',0 ,'${oid}')`)).insertId;
        return bot.sendMessage(user.id, `订单生成成功，订单号为:\n${oid}\n订单金额为：￥${amount.toFixed(2)}\n\n正在申请卡号中.....`, { replyMarkup:  bot.inlineKeyboard([
                [
                    bot.inlineButton('取消申请', { callback: 'cancelApplication'})
                ]])}).then( (re) =>{
                    let text = re.text.split('\n\n');
            query(`UPDATE \`orders\` SET \`mid\`='${re.message_id}',\`chatid\`='${re.chat.id}',\`text\`='${text[0]}' WHERE \`id\`='${id}'`);
            this.lisent.set(re.chat.id, id);
            bot.sendMessage(user.id, `请填写付款人姓名/卡号/银行名称/开户行地址\n\n例如：\n张三/66170033800088888888/中国建设银行/中山支行\n\n\n`).then((ree) => {
                setTimeout(() => {
                    bot.deleteMessage(ree.chat.id, ree.message_id);
                }, 1000*60);
            });
        });
    }
    async handlerStart(data, msg){
        switch (data) {
            case 'lk':
                break;
            case 'xf':
                break;
            default:
                break;
        }
    }
    async handlerPhoto(msg){
        if (msg.photo === undefined) return false;
        bot.deleteMessage(msg.from.id, msg.message_id).catch(() => {});
        const files = msg.photo;
        if(this.lisent.has(msg.chat.id)){
            const orders = this.lisent.get(msg.chat.id);
            if (orders){
                if (orders.img === undefined){
                    return ;
                }
                if (orders.img !== null){
                    const fileDel = (orders.img).split('/');
                    deleteFile(`${path}/${fileDel[0]}`, fileDel[fileDel.length-1]);
                }
                const file = await bot.getFile(files[files.length-1].file_id);
                const filename = `${new Date().getTime()}`
                await downloadFileAsync(file.fileLink, path+`/photos/${filename}`);
                await query(`UPDATE \`orders\` SET \`img\`='/photos/${filename}', \`status\`=5 WHERE \`id\`='${orders.id}'`);
            }
            this.lisent.delete(msg.chat.id);
        }
    }
    async handlerCancelApplication(msg){
        const orders = await this.getOrders(msg);
        if (orders){
            await query(`UPDATE \`orders\` SET \`status\`=4 WHERE \`id\`='${orders.id}'`);
            bot.editMessageText({chatId: orders.chatid ,messageId : orders.mid }, `${msg.text}\n\n已被主动取消！`);
        }
    }
    async handlerAlreadyPay(msg){
        const orders = await this.getOrders(msg);
        if (orders && !this.lisent.has(msg.chat.id)){
            this.lisent.set(msg.chat.id, orders);
            bot.sendMessage(orders.chatid, `请把转账截图发给我`).then(re => {
                setTimeout(() => {
                    bot.deleteMessage(re.chat.id, re.message_id);
                }, 1000*15);
            });
        }
    }
    async handlerXiaFaOpention(id, user, msg, confirm = false){
        const outlook = await query(`SELECT * FROM \`outlook\` WHERE \`id\`='${id}'`);
        if (outlook[0]){
            if (confirm === false){
                const amount = parseInt(user.amount) + parseInt(outlook[0].amount);
                await query(`UPDATE \`user\` SET \`amount\`='${amount}' WHERE \`uid\`='${user.uid}'`);
                await query(`UPDATE \`outlook\` SET \`status\`=2 WHERE \`id\`='${outlook[0].id}'`);
                return  bot.editMessageText({chatId: outlook[0].chatid ,messageId : outlook[0].mid }, `${msg.text}\n\n\n已被主动取消，平台余额将返还：￥${(parseInt(outlook[0].amount) /100).toFixed(2)}`).catch(() => {});
            }else{
                await query(`UPDATE \`outlook\` SET \`status\`=1 WHERE \`id\`='${outlook[0].id}'`);
                return  bot.editMessageText({chatId: outlook[0].chatid ,messageId : outlook[0].mid }, `${msg.text}\n\n\n已确认成功，正在等待系统审核....`).catch(() => {});
            }
        }
    }
    async handlerOthers(req ,user){
        const data = (req.data).split('+');
        switch (data[0]) {
            case 'lk':
                await this.creatOrders(parseInt(data[1]) ,user);
                bot.deleteMessage(req.message.chat.id, req.message.message_id);
                break;
            case 'xf':
                bot.deleteMessage(req.message.chat.id, req.message.message_id);
                break;
            case 'qrxf':
                await this.handlerXiaFaOpention(data[1], user, req.message, true);
                break;
            case 'qxxf':
                await this.handlerXiaFaOpention(data[1], user, req.message);
                break;
            default:
                // bot.answerCallbackQuery(req.id,`未知操作！${req.data}`, true);
                bot.sendMessage(req.message.chat.id, `未知操作！${req.data}`).then(re => {
                    setTimeout(() => {
                        bot.deleteMessage(re.chat.id, re.message_id);
                    }, 1000*15);
                });
                bot.deleteMessage(req.message.chat.id, req.message.message_id);
                break;
        }
    }
    async handlerXiaFa(msg, user) {
        const data = ((msg).replace('/xf','')).replace(/(^\s*)|(\s*$)/g, "");
        if (data === ''){
            bot.sendMessage(user.id, `未指定下发金额\n如下示例：\n\n/xf 10000`).then(re => {
                // console.log(re);
                setTimeout(() => {
                    bot.deleteMessage(re.chat.id, re.message_id);
                }, 1000*15);
            });
        }else {
            if (parseInt(data) < 10000) {
                bot.sendMessage(user.id, `您要下发的金额：￥${(parseInt(data)).toFixed(2)}\n\n\n\n金额小于 ￥10000 不予下发！`).then(re => {
                    setTimeout(() => {
                        bot.deleteMessage(re.chat.id, re.message_id);
                    }, 1000*15);
                });
                return false;
            }
            if (parseInt(user.amount) < (parseInt(data) * 100)){
                bot.sendMessage(user.id, `您的余额将剩余：￥${(parseInt(user.amount) / 100).toFixed(2)}\n\n\n\n对不起，您目前的余额不足以下发！`).then(re => {
                    setTimeout(() => {
                        bot.deleteMessage(re.chat.id, re.message_id);
                    }, 1000*15);
                });
                return false;
            }else{
                let usdt2rmb = (await query(`SELECT * FROM \`system\` WHERE \`key\`='usdt2rmb' and \`status\` = 1`))[0].value;
                usdt2rmb = usdt2rmb ? parseFloat(usdt2rmb) : 1;
                const amount = parseInt(user.amount) - (parseInt(data) * 100);
                const id = (await query(`INSERT INTO \`outlook\`(\`amount\`, \`ctime\`, \`status\`, \`uid\`) 
                           VALUES ('${parseInt(data) * 100 }', '${Math.floor((new Date().getTime()) / 1000)}', 0, '${user.uid}')`)).insertId;
                await query(`UPDATE \`user\` SET \`amount\`='${amount}' WHERE \`uid\`='${user.uid}'`);
                return bot.sendMessage(user.id, `您的余额：￥${(amount / 100).toFixed(2)}\n平台USDT汇率为 1USDT= ￥${usdt2rmb.toFixed(2)}\n\n本次下发金额：￥${parseInt(data)}\n兑换的USDT大约：${(parseInt(data) / usdt2rmb).toFixed(2)}\n\n具体到账数量由管理员最终解释！` , { replyMarkup: bot.inlineKeyboard([
                        [
                            bot.inlineButton(`确认下发`, { callback: `qrxf+${id}`}),
                            bot.inlineButton(`取消下发`, { callback: `qxxf+${id}`})
                        ]
                    ])}).then( (re) => {
                    query(`UPDATE \`outlook\` SET \`mid\`='${re.message_id}',\`chatid\`='${re.chat.id}',\`text\`='${re.text}' WHERE \`id\`='${id}'`);
                });
            }
        }
    }
    async teleBot(){
        bot.on('/start', async (msg) => {
            if (msg.chat.type !== 'private') return;
            const user = msg.from;
            bot.deleteMessage(user.id, msg.message_id);
            console.log(msg.text)
            let userId = '';
            const userDb = await query(`SELECT * FROM \`user\` WHERE \`id\`='${user.id}'`);
            const utime = Math.floor(Date.now() / 1000);
            if (userDb[0] === undefined){
                const uid = (await query(`INSERT INTO \`user\`(\`id\`, \`first_name\`, \`last_name\`, \`language_code\`, \`status\`, \`ctime\`) 
                            VALUES ('${user.id}', '${user.first_name}', '${user.last_name}', '${user.language_code}',1,'${utime}')`)).insertId;
                userId = this.getUserId(uid);
                // console.log(userId);
                await query(`UPDATE \`user\` SET \`sid\`='${userId}' WHERE \`uid\`='${uid}'`);
            }else {
                userId = userDb[0].sid;
                if (userDb[0].status === 0) {
                    return bot.sendMessage(user.id, `您的身份识别代码为：${userId}\n此身份已进入黑名单并且已经禁止使用所有功能`).then(re => {
                        // console.log(re);
                        setTimeout(() => {
                            bot.deleteMessage(re.chat.id, re.message_id);
                        }, 1000*15);
                    });
                }
            }
            const data = ((msg.text).replace('/start','')).replace(/(^\s*)|(\s*$)/g, "");
            if (data === ''){
                return bot.sendMessage(msg.from.id, `欢迎使用代付自助系统，\n您的身份识别代码为：${userId}\n请记住您的识别代码！`).then(re => {
                    // console.log(re);
                    setTimeout(() => {
                        // bot.deleteMessage(re.chat.id, re.message_id);
                    }, 1000*15);
                });
            }else{
                await this.handlerStart(data, msg);
            }
        });
        bot.on('/cha', async (msg) => {
            const user = await this.authUser(msg);
            if (user === false) {
                return user;
            }
            bot.deleteMessage(msg.from.id, msg.message_id).catch(() => {});
            return bot.sendMessage(user.id, `您目前平台余额：￥${(user.amount / 100).toFixed(2)}\n\n\n\n请选择以下快捷操作!`, { replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton('充值', { callback: `laika`}),
                    bot.inlineButton('下发', { callback: `xiafa`})]
                ])});
        });
        bot.on('/lk', async (msg) => {
            const user = await this.authUser(msg);
            if (user === false) {
                return user;
            }
            bot.deleteMessage(msg.from.id, msg.message_id).catch(() => {});
            await this.handlerLaiKa(msg.text ,user);
        });
        bot.on('/xf',async (msg) => {
            const user = await this.authUser(msg);
            if (user === false) {
                return user;
            }
            bot.deleteMessage(msg.from.id, msg.message_id).catch(() => {});
            await this.handlerXiaFa(msg.text, user);
        });
        bot.on('*', async (msg) => {
            const user = await this.authUser(msg);
            if (user === false) {
                return user;
            }
            await this.handlerPhoto(msg, user);
        });
        bot.on('callbackQuery', async (req) =>{
            // console.log(req);return
            const user = await this.authUser(req.message);
            if (user === false) {
                return user;
            }
            switch (req.data) {
                case 'alreadyPay':
                    await this.handlerAlreadyPay(req.message);
                    break;
                case 'cancelApplication':
                    await this.handlerCancelApplication(req.message);
                    break;
                case 'laika':
                    bot.deleteMessage(req.message.chat.id, req.message.message_id);
                    await this.handlerLaiKa(`/lk `, user);
                    break;
                case 'xiafa':
                    bot.deleteMessage(req.message.chat.id, req.message.message_id);
                    await this.handlerXiaFa(`/xf `, user);
                    break;
                default:
                    await this.handlerOthers(req ,user);
                    break;
            }
        });
        bot.on('text',async (msg) => {
            const user = await this.authUser(msg);
            if (user === false) {
                return user;
            }
            bot.deleteMessage(msg.from.id, msg.message_id).catch(() => {});
            if (this.lisent.has(msg.chat.id) && (msg.text).indexOf("/") > -1) {
                const oid = this.lisent.get(msg.chat.id);
                if (oid.constructor === Object){
                    return ;
                }
                const orders = (await query(`SELECT * FROM \`orders\` WHERE \`id\`='${oid}'`))[0];
                if (orders && orders.remark === null){
                    await query(`UPDATE \`orders\` SET \`remark\`='${msg.text}' WHERE \`id\`='${orders.id}'`);
                }
                this.lisent.delete(msg.chat.id);
            }
        });
        bot.start();
        username = (await bot.getMe()).username;
        uuid = (await bot.getMe()).id;
    }
    endTime(time) {
        const nowTimeDate = new Date(time)
        return Math.floor((nowTimeDate.setHours(23, 59, 59, 999)) / 1000 );
    }
    startTime(time) {
        const nowTimeDate = new Date(time)
        return Math.floor((nowTimeDate.setHours(0, 0, 0, 0)) / 1000 );
    }
    async run(){
        const teleApi = config.getTeleApi();
        apiId = parseInt(teleApi.apiId);
        apiHash = teleApi.apiHash;
        const system = await query(`SELECT * FROM \`system\` WHERE \`key\`='robot' and \`status\` = 1`);
        if (system[0] && system[0].status === 1 && system[0].value !== null) {
            botAuthToken = system[0].value;

        }else {
            console.log(`找不到机器人配置.....`);
            botAuthToken =  await input.text('bot Token ?');
        }
        try {
            client = new TelegramClient(new StringSession(''),
                apiId, apiHash, {connectionRetries: 5});
            bot = new TeleBot(botAuthToken);
            if(await this.setBotCommands()){
                await this.teleBot();
            }
        }catch (e) {

            if (e.errorMessage === 'ACCESS_TOKEN_EXPIRED' ) {
                await sleep(1000);
                botAuthToken = '';
                if (system[0]){
                    // await query(`DELETE FROM \`system\` WHERE \`id\`='${system[0].id}'`);
                    await query(`UPDATE \`system\` SET \`value\`='' WHERE \`id\`='${system[0].id}'`);
                }
                console.log(`机器人token失效或者错误!`);
                return this.run();
            } else {
                console.log(e);
            }
        }
        if (system[0] === undefined){
            await query(`INSERT INTO \`system\`(\`name\`,\`key\`, \`value\`, \`status\`) VALUES ('机器人密钥','robot','${botAuthToken}',1)`);
        }
    }
}

let instTeleApi = new TeleApi();
module.exports = instTeleApi;

