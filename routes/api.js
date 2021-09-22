const express = require('express');
const router = express.Router();
const instSession = require('../session');
const fs = require('fs');
const functions = require('../functions');
router.all('*',async (req,res,next) =>{
    // if (req.method === 'POST'){
    //     req.body = JSON.parse(await functions.decrypt((Object.keys(req.body)[0]).replace(/\_/g, '+')))
    //     // console.log(req.body);
    // }
    const {token} = req.headers;
    const {path} = req;
    const ip = (req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress).split(':');
    const date = new Date();
    const dateTime = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    const data = req.method === 'POST' ? req.body : req.query;
    functions.log({
        path : req.path,
        ip : ip[ip.length -1],
        method : req.method,
        data : data,
        time : dateTime
    });
    const user = await instSession.getUserBySid(token);
    if (path === '/user/login'){
        return  next();
    }
    if (user === false){
        return  res.send({
            code: 50008,
            message: '登录已过期! Permission denied!'
        });
    }
    next();
    // const reloadSend = res.send;
    // res.send = async function(data){
    //     if (data === undefined){
    //         return data;
    //     }
    //     return reloadSend(await functions.encrypt(JSON.stringify(data)));
    // };
});

router.use('/telebot', require('./telebot'));
router.use('/user', require('./user'));
router.use('/transaction', require('./transaction'));
module.exports = router;
