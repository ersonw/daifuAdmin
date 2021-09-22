const functions = require('./functions');
const fs = require("fs");
const input = require('input');
const {sleep} = require("telegram/Helpers");
const mysql = require('mysql');
let query = function () {
    throw {code: 'INIT_FUNCTION'}
};

class Config {
    constructor() {
        this.config = new Map();
    }
    async testDbs(){
        let dbs = this.config.get('dbs');
        if (dbs === undefined){
            return false;
        }
        try {
            await query('SELECT * FROM `banks`');
            return true;
        }catch (e) {
            if(e.code === 'ER_ACCESS_DENIED_ERROR'){
                console.log('数据库验证密码错误! 请重新输入');
                const user = await input.text(`数据库用户名 ?(${dbs.user})`);
                const password = await input.text(`数据库用户密码 ?(${dbs.password})`);
                const host = await input.text(`数据库链接地址 ?(${dbs.host})`);
                if (user){
                    dbs.user = user;
                }
                if (password){
                    dbs.password = password;
                }
                if (host){
                    dbs.host = host;
                }
            }
            if (e.code === 'ER_BAD_DB_ERROR'){
                console.log('数据库不存在! 请重新输入');
                const database = await input.text('数据库名 ?');
                if (database){
                    dbs.database = database;
                }
            }
            if (e.code === 'ER_CON_COUNT_ERROR'){
                //连接池出错
            }
            if (e.code === 'ER_NO_SUCH_TABLE'){
                return true;
            }
            const pool = mysql.createPool({
                host     :  dbs.host,
                user     :  dbs.user,
                password :  dbs.password,
                charset: 'utf8mb4',
                database :  dbs.database,
                port     :  dbs.port
            });
            this.config.set('dbs',dbs);
            this.config.set('mysql', pool);
            // console.log(e)
            await this.saveConfig(await this.makeConfig());
            // await sleep(1000);
            if (e.code === 'INIT_FUNCTION'){
                query = require('./dbs');
            }
            return this.testDbs();
        }
    }
    async testFiles(){
        await functions.printFiles('/img/update-bg.png');
    }
    async makeConfig(ask = false){
        let dbs = this.config.get('dbs');
        let server = this.config.get('server');
        let teleApi = this.config.get('teleApi');
        if (ask){
            console.log('正在生成默认配置~');
            if (dbs === undefined){
                dbs = {
                    user: 'root',
                    password: '',
                    host: '127.0.0.1',
                    database: '',
                    port: 3306
                };
            }
            let t  = await input.text(`数据库用户名 ?(${dbs.user})`);
            dbs.user = t ? t : dbs.user;
            while (!dbs.password){
                dbs.password = await input.text(`数据库密码 ?`);
                if (!dbs.password){
                    console.log('数据库密码不可为空！');
                }
            }
            while (!dbs.database){
                dbs.database = await input.text(`数据库名 ?`);
            }
            t = await input.text(`数据库地址 ?(${dbs.host})`);
            dbs.host = t ? t : dbs.host;
            t = await input.text(`数据库端口 ?(${dbs.port})`);
            dbs.port = t ? t : dbs.port;
            if (server === undefined){
                server = {
                    ip: 'localhost',
                    port: 88
                };
            }
            t = await input.text(`本机网卡IP/域名 ?(${server.ip})`);
            server.ip = t ? t : server.ip;
            t = await input.text(`WEB端口 ?(${server.port})`);
            server.port = t ? t : server.port;
            if (teleApi === undefined) {
                teleApi = {
                    apiId: 0,
                    apiHash: ''
                };
            }
            while (!teleApi.apiId){
                teleApi.apiId = await input.text(`Telegram 开发者 API ID ?`);
            }
            while (!teleApi.apiHash){
                teleApi.apiHash = await input.text(`Telegram 开发者 API Hash ?`);
            }
        }

        return  JSON.stringify({
            dbs: dbs,
            server: server,
            teleApi: teleApi
        });
    }
    async getConfig(){
        let data = '';
        try {
            data = (await fs.readFileSync(process.cwd()+'/config.sys')).toString();
            if (data === ''){
                return false;
            }
            data = JSON.parse(data);
            if (data.dbs === undefined){
                return false;
            }
            // console.log('数据库配置获取成功！');
            this.config.set('dbs',data.dbs);
            if (data.server === undefined){
                return false;
            }
            // console.log('WEB配置获取成功！');
            this.config.set('server', data.server);
            if (data.teleApi === undefined){
                return false;
            }
            // console.log('teleApi配置获取成功！');
            this.config.set('teleApi', data.teleApi);
            console.log('获取全部配置成功！');
            return true;
        }catch (e) {
            return false;
        }
    }
    async saveConfig(data = ''){
        if (!data){
            data = await this.makeConfig(true);
        }
        try {
            await fs.writeFileSync(process.cwd()+'/config.sys', data);
        }catch (e) {
            console.log(e);
        }
    }
    async initConfig(){
        if(await this.getConfig() === false){
            await sleep(1000);
            console.log('获取配置文件失败，正在生成默认配置....');
            await this.saveConfig();
            return this.initConfig();
        }
        // console.log('初始化默认配置成功！');
        if (await this.testDbs() === false){
            return this.initConfig();
        }
        await this.initDbs();
        // console.log('初始化数据库成功！');
        // await this.testFiles();
        // console.log('文件释放成功！');
    }
    async initDbs(){
        try {
            await query(`SELECT * FROM \`banks\``);
        }catch (e) {
            // return console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `banks` (\n' +
                    '  `BankUser` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `BankName` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `BankNumber` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `BankOpen` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `ctime` int(11) NOT NULL,\n' +
                    '  `uid` int(11) NOT NULL,\n' +
                    '  `bid` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `id` int(11) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');
                await query('ALTER TABLE `banks`\n' +
                    '  ADD PRIMARY KEY (`id`);');
                await query('ALTER TABLE `banks`\n' +
                    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;');
            }
        }
        try {
            await query(`SELECT * FROM \`orders\``);
        }catch (e) {
            // console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `orders` (\n' +
                    '  `amount` bigint(255) NOT NULL,\n' +
                    '  `oid` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `bid` int(11) NOT NULL,\n' +
                    '  `uid` int(11) NOT NULL,\n' +
                    '  `mid` int(11) DEFAULT NULL,\n' +
                    '  `chatid` int(11) DEFAULT NULL,\n' +
                    '  `remark` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `text` text COLLATE utf8mb4_bin,\n' +
                    '  `img` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `ctime` int(11) NOT NULL,\n' +
                    '  `status` int(11) NOT NULL,\n' +
                    '  `id` bigint(255) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');
                await query('ALTER TABLE `orders`\n' +
                    '  ADD PRIMARY KEY (`id`);');
                await query('ALTER TABLE `orders`\n' +
                    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;');
            }
        }
        try {
            await query(`SELECT * FROM \`outlook\``);
        }catch (e) {
            // console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `outlook` (\n' +
                    '  `mid` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `chatid` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `amount` bigint(255) NOT NULL,\n' +
                    '  `text` text COLLATE utf8mb4_bin,\n' +
                    '  `remark` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `ctime` int(11) NOT NULL,\n' +
                    '  `status` int(11) NOT NULL,\n' +
                    '  `uid` int(11) NOT NULL,\n' +
                    '  `id` int(11) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');
                await query('ALTER TABLE `outlook`\n' +
                    '  ADD PRIMARY KEY (`id`);');
                await query('ALTER TABLE `outlook`\n' +
                    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;');
            }
        }
        try {
            await query(`SELECT * FROM \`system\``);
        }catch (e) {
            // console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `system` (\n' +
                    '  `name` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `key` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `value` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `utime` int(11) NOT NULL,\n' +
                    '  `status` int(11) NOT NULL,\n' +
                    '  `id` int(11) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');

                await query('INSERT INTO `system` (`name`, `key`, `value`, `utime`, `status`, `id`) VALUES\n' +
                    '(\'机器人密钥\', \'robot\', \'1974490745:AAEplF5PT8VxA7-NKLUNHJvMwDDF9M07cwI\', 1631382305, 1, 3),\n' +
                    '(\'USDT汇率人民币\', \'usdt2rmb\', \'6.50\', 1631382171, 1, 4),\n' +
                    '(\'管理员TG\', \'tgname\', \'ersonw\', 1631384313, 1, 5);');
                await query('ALTER TABLE `system`\n' +
                    '  ADD PRIMARY KEY (`id`);');
                await query('ALTER TABLE `system`\n' +
                    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14');
            }
        }
        try {
            await query(`SELECT * FROM \`sys_user\``);
        }catch (e) {
            // console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `sys_user` (\n' +
                    '  `username` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `password` varchar(32) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `salt` varchar(32) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `tgname` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `ctime` int(11) NOT NULL,\n' +
                    '  `status` int(11) NOT NULL,\n' +
                    '  `roles` int(11) NOT NULL,\n' +
                    '  `id` int(11) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');

                await query('INSERT INTO `sys_user` (`username`, `password`, `salt`, `tgname`, `ctime`, `status`, `roles`, `id`) VALUES\n' +
                    '(\'admin\', \'d5394a0dd02c2baeb5e8270f791c5dc9\', \'7W2CdYkLnxi8KuFCqQOxrhHfYYIdPkpt\', \'ersonw\', 1626694096, 1, 0, 1);');
                await query('ALTER TABLE `sys_user`\n' +
                    '  ADD PRIMARY KEY (`id`);');
                await query('ALTER TABLE `sys_user`\n' +
                    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;');
            }
        }
        try {
            await query(`SELECT * FROM \`user\``);
        }catch (e) {
            // console.log(e.code)
            if (e.code === 'ER_NO_SUCH_TABLE'){
                await query('CREATE TABLE `user` (\n' +
                    '  `id` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `first_name` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `last_name` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `language_code` varchar(500) COLLATE utf8mb4_bin NOT NULL,\n' +
                    '  `sid` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `amount` bigint(255) NOT NULL DEFAULT \'0\',\n' +
                    '  `usdt_addr` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,\n' +
                    '  `ctime` int(11) NOT NULL,\n' +
                    '  `status` int(11) NOT NULL,\n' +
                    '  `uid` int(11) NOT NULL\n' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;');
                await query('ALTER TABLE `user`\n' +
                    '  ADD PRIMARY KEY (`uid`);');
                await query('ALTER TABLE `user`\n' +
                    '  MODIFY `uid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14');
            }
        }
    }
    getDbs(){
        if (this.config.has('dbs')){
            if (this.config.has('mysql')){
                return this.config.get('mysql');
            }
            const dbs = this.config.get('dbs');
            const pool = mysql.createPool({
                host     :  dbs.host,
                user     :  dbs.user,
                password :  dbs.password,
                charset: 'utf8mb4',
                database :  dbs.database,
                port     :  dbs.port
            });
            this.config.set('mysql', pool);
            return pool;
        }
        return false;
    }
    getServer(){
        if (this.config.has('server')){
            return this.config.get('server');
        }
        return false;
    }
    getTeleApi(){
        if (this.config.has('teleApi')){
            return this.config.get('teleApi');
        }
        return false;
    }
}
let instConfig = new Config();
module.exports = instConfig;
