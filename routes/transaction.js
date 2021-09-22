const express = require('express');
const router = express.Router();
const instSession = require('../session');
const query =require('../dbs');
const functions = require('../functions');

router.get('/list',async (req,res) => {
    let { startDate, endDate, id, t } = req.query;
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    const item = [];
    if (user && t ){
        if (startDate === undefined || startDate === ''){
            // var m = (new Date().getMonth() + 1);
            // if (m < 10) {
            //     m = `0${m}`;
            // }
            // startDate = `${new Date().getFullYear()}-${m}-${new Date().getDate()}`;
            startDate = await functions.startTime(new Date().getTime());
        }else {
            startDate = await functions.startTime(startDate);
        }
        if (endDate === undefined || endDate === ''){
            endDate = await functions.endTime((startDate * 1000));
        }else {
            endDate = await functions.endTime(endDate);
        }
        // console.log(`${startDate} === ${endDate}`)
        // startDate = Math.floor(new Date(`${startDate} 00:00:00`).getTime() / 1000);
        // endDate = Math.floor(new Date(`${endDate} 23:59:59`).getTime() / 1000);
        let where = '';
        if (id !== undefined && id !== ''){
            if (id.indexOf("K") > -1){
                const bank = await query(`SELECT * FROM \`banks\` WHERE \`bid\`='${id}'`);
                if (bank[0]){
                    where = `and \`bid\`='${bank[0].id}'`;
                }
            }else if (id.indexOf("Y") > -1){
                const users = await query(`SELECT * FROM \`user\` WHERE \`sid\`='${id}'`);
                if (users[0]){
                    where = `and \`uid\`='${users[0].uid}'`;
                }
            }
        }
        //查询已完成记录
        let dbs = await query(`SELECT * FROM \`orders\` WHERE \`status\`=2 ${where} and \`ctime\` > ${startDate} and \`ctime\` < ${endDate}`);
        let order_no = (dbs[0] ? dbs.length : 0);
        let price = 0;
        let status = 1;
        for await (const v of dbs) {
            price = price + (parseInt(v.amount) / 100);
        }
        item.push({
            order_no: order_no,
            price: price,
            status: status
        });
        //查询待完成记录
        dbs = await query(`SELECT * FROM \`orders\` WHERE \`status\`=1 ${where} and \`ctime\` > ${startDate} and \`ctime\` < ${endDate}`);
        order_no = (dbs[0] ? dbs.length : 0);
        price = 0;
        status = 0;
        for await (const v of dbs) {
            price = price + (parseInt(v.amount) / 100);
        }
        item.push({
            order_no: order_no,
            price: price,
            status: status
        });
        //查询已取消记录
        dbs = await query(`SELECT * FROM \`orders\` WHERE \`status\`=4 ${where} and \`ctime\` > ${startDate} and \`ctime\` < ${endDate}`);
        order_no = (dbs[0] ? dbs.length : 0);
        price = 0;
        status = 2;
        for await (const v of dbs) {
            price = price + (parseInt(v.amount) / 100);
        }
        item.push({
            order_no: order_no,
            price: price,
            status: status
        });
        //查询已拒绝记录
        dbs = await query(`SELECT * FROM \`orders\` WHERE \`status\`=3 ${where} and \`ctime\` > ${startDate} and \`ctime\` < ${endDate}`);
        order_no = (dbs[0] ? dbs.length : 0);
        price = 0;
        status = 3;
        for await (const v of dbs) {
            price = price + (parseInt(v.amount) / 100);
        }
        item.push({
            order_no: order_no,
            price: price,
            status: status
        });
        return res.send({
            code: 20000,
            data: {
                items : item
            }
        });
    }
    res.send({code: 50000, message: 'Permission denied!'});
});
router.get('/static',async (req,res) => {
    const { token } = req.headers;
    let panel = {};
    let lineChartData = {
        newVisitis: { actualData: []},
        purchases: { actualData: []}
    };
    const user = await instSession.getUserBySid(token);
    if (user ){
        //获取七日曲线
        lineChartData.newVisitis.actualData = await functions.getUserLine();
        lineChartData.purchases.actualData = await functions.getOredersLine();
        let dayStart = await functions.startTime(new Date().getTime());
        let dayEnd = await functions.endTime(new Date().getTime());
        //今日注册
        let dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        panel.message = dbs;
        //总注册
        dbs = (await query(`SELECT count(*) as count FROM \`user\``))[0].count;
        panel.newVisitis = dbs;
        //今日成交
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        panel.shopping = dbs;
        //总成交
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 `))[0].count;
        panel.purchases = dbs;
        return res.send({
            code: 20000,
            data: {
                panel: panel,
                lineChartData: lineChartData
            }
        });
    }
    res.send({code: 50000, message: 'Permission denied!'});
});


module.exports = router;
