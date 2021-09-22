const express = require('express');
const router = express.Router();
const query =require('../dbs');
const instSession = require('../session');
const TeleApi = require('../teleapi');
const functions = require('../functions');

router.get('/list', async (req,res) => {
    let { page, limit, id, status, date } = req.query;
    if (date === undefined){
        date = new Date();
    }else {
        date = new Date(date);
    }
    const startDate = Math.floor((new Date(`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} 00:00:00`)).getTime() /1000);
    const endDate = Math.floor((new Date(`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} 23:59:59`)).getTime() /1000);
    if (page === undefined || page < 1){
        page = 1;
    }
    if (limit === undefined || limit < 20){
        limit = 20;
    }
    const offset = (page -1) * limit;
    let search;
    let count;
    if (id === undefined){
        var sql = '';
        if (status !== undefined){
            sql = `and \`status\`='${status}' `
        }
        count = (await query(`SELECT count(*) as count FROM \`orders\` WHERE \`ctime\` > ${startDate} and \`ctime\` < ${endDate} ${sql}`))[0].count;
        search = await query(`SELECT * FROM \`orders\` WHERE \`ctime\` > ${startDate} and \`ctime\` < ${endDate} ${sql} ORDER BY \`id\` DESC LIMIT ${offset}, ${parseInt(limit)}`);
    } else {
        // count = 1;
        if (id.indexOf("K") > -1){
            const banks = await query(`SELECT * FROM \`banks\` WHERE \`bid\`='${id}'`);
            if (banks[0]){
                count = (await query(`SELECT count(*) as count FROM \`orders\` WHERE \`bid\`='${banks[0].id}'`))[0].count;
                search = await query(`SELECT * FROM \`orders\` WHERE \`bid\`='${banks[0].id}'
                                      ORDER BY \`id\` DESC`);
            }
        }else if (id.indexOf("Y") > -1){
            const users = await query(`SELECT * FROM \`user\` WHERE \`sid\`='${id}'`);
            if (users[0]){
                count = (await query(`SELECT count(*) as count FROM \`orders\` WHERE \`uid\`='${users[0].uid}'`))[0].count;
                search = await query(`SELECT * FROM \`orders\` WHERE \`uid\`='${users[0].uid}'
                                      ORDER BY \`id\` DESC`);
            }
        }else {
            count = 1 ;
            search = await query(`SELECT * FROM \`orders\` WHERE \`oid\`='${id}'`);
        }
    }
    let item = [];
    for await (const v of search){
        var t = v;
        // t.amount = parseInt(t.amount) / 100 ;
        const user = await query(`SELECT * FROM \`user\` WHERE \`uid\`='${v.uid}'`);
        if (user[0]){
            t.sid = user[0].sid;
        }
        item.push(t);
    }
    return res.send({
        code : 20000,
        data : {
            items : item,
            total : count
        }
    });
});
router.get('/getBank',async (req,res) =>{
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        const item = await query(`SELECT \`bid\`, \`id\` FROM \`banks\` WHERE 1`);
        return res.send({code: 20000, data: { item: item }});
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/update', async (req,res) =>{
    let { status, bid, t, id, BankNumber, BankName, BankUser, BankOpen, remark } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    const system = await query(`SELECT * FROM \`system\` WHERE \`key\`='tgname' and \`status\`=1`);
    if (user && t && id){
        const TGName = system[0] ? `如有疑问请<a href="https://t.me/${system[0].value}">联系管理员</a>` : '';
        const orders = await query(`SELECT * FROM \`orders\` WHERE \`id\`='${id}'`);
        if (orders[0]){
            if (status !== undefined && bid !== undefined){
                let bank = await query(`SELECT * FROM \`banks\` WHERE \`id\`='${bid}'`);
                if (bid === 0){
                    if (BankNumber && BankName && BankUser && BankOpen){
                        const getBank = await query(`SELECT * FROM \`banks\` WHERE \`BankNumber\`='${BankNumber}'`);
                        if (getBank[0]){
                            bank = await query(`SELECT * FROM \`banks\` WHERE \`id\`='${getBank[0].id}'`);
                            bid = getBank[0].id;
                        }else{
                             bid = (await query(`INSERT INTO \`banks\`(\`BankUser\`, \`BankName\`, \`BankNumber\`, \`BankOpen\`, \`ctime\`, \`uid\`) VALUES (
                            '${BankUser}','${BankName}','${BankNumber}','${BankOpen}','${ Math.floor((new Date().getTime()) / 1000 )}',0)`)).insertId;
                            const bankId =  await functions.getBankId(bid);
                            await query(`UPDATE \`banks\` SET \`bid\`='${bankId}' WHERE \`id\`='${bid}'`);
                            bank = await query(`SELECT * FROM \`banks\` WHERE \`id\`='${bid}'`);
                        }
                    }else {
                        if (status === 1) {
                            return res.send({code: 50000, message: '您选择的自定义卡号，但是没有填全自定义卡号信息！'});
                        }
                    }
                }
                if (remark === undefined || remark === '' || remark === null){
                    remark = '';
                }else {
                    remark = `理由：${remark}\n`;
                }
                if (status === 1 && bank[0]){
                    await TeleApi.editOrders(id ,`卡主姓名：${bank[0].BankUser}\n卡号：${bank[0].BankNumber}\n银行名称：${bank[0].BankName}\n开户行:${bank[0].BankOpen}`,remark, true);
                    await query(`UPDATE \`orders\` SET \`bid\`= '${bid}' WHERE \`id\`='${id}'`);
                }
                if (status === 2){
                    const uid = await query(`SELECT * FROM \`user\` WHERE \`uid\`='${orders[0].uid}'`);
                    if (uid[0]){
                        const sysFee = (await query(`SELECT * FROM \`system\` WHERE \`key\`='fee' and \`status\`=1`))[0].value;
                        const fee = uid[0].fee ? uid[0].fee : sysFee;
                        const amount = parseInt(uid[0].amount) +( parseInt(orders[0].amount) * parseFloat(fee));
                        await query(`UPDATE \`user\` SET \`amount\`='${amount}' where \`uid\`='${orders[0].uid}'`);
                        await TeleApi.editOrders(id ,`订单已完成!`,remark);
                    }
                }
                if (status === 3){
                    await TeleApi.editOrders(id ,`已被拒绝申请! ${TGName}`,remark);
                }
            }else {
                if (status === 3){
                    await TeleApi.editOrders(id ,`已被拒绝申请! ${TGName}`,remark);
                }
            }
            await query(`UPDATE \`orders\` SET \`status\`='${status}' WHERE \`id\`='${id}'`);
            return res.send({ code: 20000 });
        }
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/delete',async (req,res) =>{
    let { id, t } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && t && id){
        const orders = await query(`SELECT * FROM \`orders\` WHERE \`id\`='${id}'`);
        if (orders[0]){
            TeleApi.deleteMessage(id);
            return res.send({code: 20000});
        }
    }
    res.send({code: 50000, message: 'Permission denied!'});
});

router.get('/card/getsid',async (req,res) =>{
    const { t } = req.query;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && t){
        const users = await query(`SELECT \`sid\`, \`uid\` FROM \`user\` WHERE 1`);
        return res.send({
            code: 20000,
            data: {
                item: users
            }
        });
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.get('/card/list',async (req,res) => {
    let { page, limit, id } = req.query;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        if (page === undefined || page < 1){
            page = 1;
        }
        if (limit === undefined || limit < 20){
            limit = 20;
        }
        const offset = (page -1) * limit;
        let where = '';
        if (id !== undefined){
            if (id.indexOf("K") > -1){
                where = `WHERE \`bid\`='${id}'`;
            }else if (id.indexOf("Y") > -1){
                const users = await query(`SELECT * FROM \`user\` WHERE \`sid\`='${id}'`);
                if (users[0]){
                    where = `WHERE \`uid\`='${users[0].uid}'`;
                }
            }
        }
        const count = (await query(`SELECT count(*) as count FROM \`banks\` ${where} ORDER BY \`id\` DESC `))[0].count;
        const item = await query(`SELECT * FROM \`banks\` ${where} ORDER BY \`banks\`.\`id\` DESC LIMIT ${offset}, ${parseInt(limit)}`);
        return res.send({
            code: 20000,
            data: {
                items: item,
                total: count
            }
        });
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/card/update',async (req,res) => {
    let { BankName, BankNumber, BankOpen, BankUser, id } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && id ){
        const bank = await query(`SELECT * FROM \`banks\` WHERE \`id\`='${id}'`);
        if (bank[0]){
            if (BankName === undefined) BankName = bank[0].BankName;
            if (BankNumber === undefined) BankNumber = bank[0].BankNumber;
            if (BankOpen === undefined) BankOpen = bank[0].BankOpen;
            if (BankUser === undefined) BankUser = bank[0].BankUser;
            await query(`UPDATE \`banks\` SET \`BankUser\`='${BankUser}',\`BankName\`='${BankName}',\`BankNumber\`='${BankNumber}',\`BankOpen\`='${BankOpen}' WHERE \`id\`='${id}'`);
            return res.send({code: 20000});
        }
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/card/add',async (req,res) => {
    let { BankName, BankNumber, BankOpen, BankUser } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    const utime = Math.floor(Date.now() / 1000);
    if (user ){
        if (BankName && BankNumber && BankOpen && BankUser){
            const bank = await query(`SELECT * FROM \`banks\` WHERE \`BankNumber\`='${BankNumber}'`);
            if (bank[0] === undefined){
                const id = (await query(`INSERT INTO \`banks\`(\`BankUser\`, \`BankName\`, \`BankNumber\`, \`BankOpen\`, \`ctime\`, \`uid\`) VALUES (
                            '${BankUser}','${BankName}','${BankNumber}','${BankOpen}','${utime}',0)`)).insertId;
                const bid =  await functions.getBankId(id);
                await query(`UPDATE \`banks\` SET \`bid\`='${bid}' WHERE \`id\`='${id}'`);
                return res.send({code: 20000});
            }
        }
        return res.send({code: 50000, message: '提交的参数不全或者卡号与现有的冲突!'});
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/card/delete',async (req,res) => {
    let { id, t } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && id){
        const bank = await query(`SELECT * FROM \`banks\` WHERE \`id\`='${id}'`);
        if (bank[0] !== undefined){
            await query(`DELETE FROM \`banks\` WHERE \`id\`='${id}'`);
            return res.send({code: 20000});
        }
        return res.send({code: 50000, message: '提交的参数不全或者卡号不存在!'});
    }
    res.send({code: 50000, message: 'Permission denied!'});
});

router.get('/users/list', async (req,res) =>{
    let { page, limit, id } = req.query;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        if (page === undefined || page < 1){
            page = 1;
        }
        if (limit === undefined || limit < 20){
            limit = 20;
        }
        const offset = (page -1) * limit;
        let where = '';
        if (id !== undefined && id !== ''){
            where = `WHERE \`sid\`='${id}'`;
        }
        const count = (await query(`SELECT count(*) as count FROM \`user\` ${where} ORDER BY \`id\` DESC `))[0].count;
        const item = await query(`SELECT * FROM \`user\` ${where} ORDER BY \`uid\` DESC LIMIT ${offset}, ${parseInt(limit)}`);
        return res.send({
            code: 20000,
            data: {
                items: item,
                total: count
            }
        });
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/users/update', async (req,res) => {
    let { uid, status, amount, usdt_addr, usdt2rmb, fee } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        const users = await query(`SELECT * FROM \`user\` WHERE \`uid\`='${uid}'`);
        if (users[0]){
            if (status !== null && status !== undefined && status !== ''){
                await query(`UPDATE \`user\` SET \`status\`='${status}' WHERE \`uid\`='${uid}'`);
            }
            if (amount && amount !== users[0].amount){
                await query(`UPDATE \`user\` SET \`amount\`='${amount}' WHERE \`uid\`='${uid}'`);
            }
            if (usdt_addr && usdt_addr !== users[0].usdt_addr){
                await query(`UPDATE \`user\` SET \`usdt_addr\`='${usdt_addr}' WHERE \`uid\`='${uid}'`);
            }
            if (fee && fee !== users[0].fee){
                await query(`UPDATE \`user\` SET \`fee\`='${parseFloat(fee)}' WHERE \`uid\`='${uid}'`);
            }
            if (usdt2rmb && usdt2rmb !== users[0].usdt2rmb){
                await query(`UPDATE \`user\` SET \`usdt2rmb\`='${parseFloat(usdt2rmb)}' WHERE \`uid\`='${uid}'`);
            }
            return res.send({code: 20000});
        }

    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.post('/users/delete', async (req,res) => {
    let { uid, t } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && t){
        const users = await query(`SELECT * FROM \`user\` WHERE \`uid\`='${uid}'`);
        if (users[0]){
            await query(`DELETE FROM \`user\` WHERE \`uid\`='${uid}'`);
            await query(`DELETE FROM \`orders\` WHERE \`uid\`='${uid}'`);
            await query(`DELETE FROM \`banks\` WHERE \`uid\`='${uid}'`);
            return res.send({code: 20000});
        }
    }
    res.send({code: 50000, message: 'Permission denied!'});
});

router.get('/config/list', async (req,res) => {
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        const item = await query(`SELECT \`name\`, \`value\`, \`status\`, \`id\`,\`utime\`
                                  FROM \`system\`
                                  WHERE 1`);
        return res.send({
            code: 20000,
            data: {
                items: item,
                total: item.length
            }
        });
    }
});
router.post('/config/update', async (req,res) =>{
    let { id, name, status, value } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    const utime = Math.floor((new Date().getTime()) / 1000);
    if (user && id){
        const config = await query(`SELECT * FROM \`system\` WHERE \`id\`='${id}'`);
        if (config[0]){
            if (config[0].name === 'robot'){
                if (value !== config[0].value || status !== config[0].status){
                    TeleApi.run();
                }
            }
            if (name !== undefined && name !== null && name !== config[0].name){
                await query(`UPDATE \`system\` SET \`name\`='${name}',\`utime\`='${utime}' WHERE \`id\`='${id}'`);
            }
            if (status !== undefined && status !== null && status !== config[0].status){
                await query(`UPDATE \`system\` SET \`status\`='${status}',\`utime\`='${utime}' WHERE \`id\`='${id}'`);
            }
            if (value !== undefined && value !== null && value !== config[0].value){
                await query(`UPDATE \`system\` SET \`value\`='${value}',\`utime\`='${utime}' WHERE \`id\`='${id}'`);
            }
            return res.send({code: 20000});
        }
    }
});
router.post('/config/detele', async (req,res) =>{
    // return res.status(404).send();
    let { id } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && id){
        await query(`DELETE FROM \`system\` WHERE \`id\`='${id}'`);
        return res.send({code: 20000});
    }
});
router.post('/config/add', async (req,res) =>{
    // return res.status(404).send();
    let { key, name, status, value } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        if (key && name && status && value){
            const config = await query(`SELECT * FROM \`system\` WHERE \`key\`='${key}'`);
            if (config[0] === undefined){
                await query(`INSERT INTO \`system\`(\`name\`, \`key\`, \`value\`, \`utime\`, \`status\`) 
                      VALUES ('${name}', '${key}', '${value}', '${Math.floor((new Date().getTime()) /1000)}', '${status}')`);
            }
        }
        return res.send({code: 20000});
    }
});

router.get('/out/list',async (req,res) => {
    let { page, limit, id, status, date } = req.query;
    if (page === undefined || page < 1){
        page = 1;
    }
    if (limit === undefined || limit < 20){
        limit = 20;
    }
    const offset = (page -1) * limit;
    let startDate, endDate;
    if (date === undefined){
        // date = new Date();
    }else {
        date = new Date(date);
        startDate = Math.floor((new Date(`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} 00:00:00`)).getTime() /1000);
        endDate = Math.floor((new Date(`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} 23:59:59`)).getTime() /1000);
    }


    let search;
    let count;
    if (id === undefined){
        var sql = '';
        if (status !== undefined){
            sql = `\`status\`='${status}' `
        }
        if (!date){
            if (sql){
                sql = 'where '+sql;
            }
            count = (await query(`SELECT count(*) as count FROM \`outlook\` ${sql}`))[0].count;
            search = await query(`SELECT * FROM \`outlook\` ${sql} ORDER BY \`id\` DESC LIMIT ${offset}, ${parseInt(limit)}`);
        }else {
            if (sql){
                sql = 'and '+sql;
            }
            count = (await query(`SELECT count(*) as count FROM \`outlook\` WHERE \`ctime\` > ${startDate} and \`ctime\` < ${endDate} ${sql}`))[0].count;
            search = await query(`SELECT * FROM \`outlook\` WHERE \`ctime\` > ${startDate} and \`ctime\` < ${endDate} ${sql} ORDER BY \`id\` DESC LIMIT ${offset}, ${parseInt(limit)}`);
        }

    } else {
        count = 1;
        if (id.indexOf("Y") > -1){
            const users = await query(`SELECT * FROM \`user\` WHERE \`sid\`='${id}'`);
            if (users[0]){
                count = (await query(`SELECT count(*) as count FROM \`outlook\` WHERE \`uid\`='${users[0].uid}'`))[0].count;
                search = await query(`SELECT * FROM \`outlook\` WHERE \`uid\`='${users[0].uid}'`);
            }
        }else {
            search = await query(`SELECT * FROM \`outlook\` WHERE \`uid\`='${id}'`);
        }
    }
    let item = [];
    let usdt2rmb = (await query(`SELECT * FROM \`system\` WHERE \`key\`='usdt2rmb' and \`status\`=1`))[0].value;
    usdt2rmb = usdt2rmb ? parseFloat(usdt2rmb) : 1;
    for await (const v of search){
        var t = v;
        v.usdt = (Math.floor((parseInt(v.amount) / 100) / usdt2rmb)).toFixed(2);
        item.push(t);
    }
    return res.send({
        code : 20000,
        data : {
            items : item,
            total : count
        }
    });
});
router.get('/out/getUser',async (req,res) =>{
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        const item = await query(`SELECT \`sid\`, \`uid\` FROM \`user\` WHERE 1`);
        return res.send({
            code: 20000,
            data: {
                items: item
            }
        });
    }
});
router.post('/out/update',async (req,res) =>{
    let { status, remark, id } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user && id){
        const out = await query(`SELECT * FROM \`outlook\` WHERE \`id\`='${id}'`);
        if (out[0] !== undefined && status !== undefined){
            if (remark === undefined) {
                remark = out[0].remark;
            }
            if (status === 3 && status !== out[0].status){
                await TeleApi.editOut(out[0], remark, true);
            }
            if (status === 4 && status !== out[0].status){
                await TeleApi.editOut(out[0], remark);
            }
            await query(`UPDATE \`outlook\` SET \`status\`='${status}',\`remark\`='${remark}' WHERE \`id\`='${id}'`);
            return res.send({code: 20000});
        }
    }
});
router.post('/out/delete',async (req,res) =>{
    let { id } = req.body;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        if (id !== undefined){
            const out = await query(`SELECT * FROM \`outlook\` WHERE \`id\`='${id}'`);
            if (out[0]){
                await TeleApi.deleteOut(out[0]);
            }
        }
        return res.send({code: 20000});
    }
});

router.get('/contact/list', async (req,res) =>{
    let { page, limit } = req.query;
    if (!page || page < 1){
        page = 1;
    }
    if (!limit || limit < 20){
        limit = 20;
    }
    const offset = (page -1) * limit;
    const item = await query(`SELECT * FROM \`contact\` ORDER BY \`id\` DESC LIMIT ${offset},${limit}`);
    const count = await query(`SELECT COUNT(*) AS count FROM \`contact\` WHERE 1`);
    res.send({
        code: 20000,
        data: {
            items: item,
            total: count
        }
    });
});
router.post('/contact/update',async (req,res) => {
    let { id, name, link, type } = req.body;
    const dbs = await query(`SELECT * FROM \`contact\` WHERE \`id\`='${id}'`);
    if (dbs[0]){
        if (name && name !== dbs[0].name){
            await query(`UPDATE \`contact\` SET \`name\`='${name}' WHERE \`id\`='${id}'`);
        }
        if (link && link !== dbs[0].link){
            await query(`UPDATE \`contact\` SET \`link\`='${link}' WHERE \`id\`='${id}'`);
        }
        if (type && type !== dbs[0].type){
            await query(`UPDATE \`contact\` SET \`type\`='${type}' WHERE \`id\`='${id}'`);
        }
        return res.send({code: 20000});
    }
    res.send({
        code: 50000,
        message: '系统错误！未找到该记录！'
    });
});
router.post('/contact/add',async (req,res) => {
    let { name, link, type, status } = req.body;
    const dbs = await query(`SELECT * FROM \`contact\` WHERE \`name\`='${name}' and \`type\`='${type}'`);
    if (!dbs[0]){
        if (!link || link.indexOf('http') === -1 ){
            return res.send({code: 50000, message: '客服链接不可为空！'});
        }
        if (!type) {
            type = 1;
        }
        await query(`INSERT INTO \`contact\`(\`name\`, \`link\`, \`type\`, \`ctime\`, \`status\`) 
                                     VALUES ('${name}', '${link}', '${type}', '${Math.floor(new Date().getTime() / 1000)}', '${status}')`);
        return res.send({code: 20000});
    }
    res.send({code: 50000, message: '同类型的已有一个同名！'});
});
router.post('/contact/delete',async (req,res) => {
    let { id } = req.body;
    const dbs = await query(`SELECT * FROM \`contact\` WHERE \`id\`='${id}'`);
    if (dbs[0]){
        await query(`DELETE FROM \`contact\` WHERE \`id\`='${id}'`);
        return res.send({code: 20000});
    }
    res.send({code: 50000, message: '记录不存在！'});
});
module.exports = router;
