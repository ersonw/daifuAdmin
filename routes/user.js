const express = require('express');
const router = express.Router();
const instSession = require('../session');
const query =require('../dbs');
const functions = require('../functions');

router.post('/login', async (req,res) =>{
    const session = req.session;
    const token = session.id;
    const {username ,password} = req.body;
    if (username && password){
        const user = await query(`SELECT * FROM \`sys_user\` WHERE \`username\`='${username}'`);
        if (user[0]){
            if (user[0].status === 1){
                if(  await functions.userAuthLogin(password, {password:user[0].password, salt:user[0].salt})){
                    if(await instSession.addUser(token, user[0].id) === true){
                        return res.send({code:20000,data: {token: token}});
                    }
                }
            }else{
                return res.send({code:60204,message: '账号已被禁用！'});
            }
        }
    }
    res.send({code:60204,message: '账号或者密码错误！'});
});
router.get('/info', async function(req,res){
    return res.send({
        code: 20000,
        data:{
            roles: ["admin"],
            introduction: 'I am a super administrator',
            avatar: '/NORDestB',
            name: 'Super Admin'
        }
    });
});
router.get('/logout',async (req,res) => {
    const {token} = req.headers;
    const user = await instSession.getUserBySid(token);
    if (user){
        await instSession.delUserBySid(token);
        return res.send({
            code: 20000
        });
    }
    res.status(404).send({code: 50000, message: 'Permission denied!'});
});
module.exports = router;
