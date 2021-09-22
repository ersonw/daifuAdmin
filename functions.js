const md5 = require('md5');
const NodeRSA = require('node-rsa');
const query = require('./dbs');
const fs = require("fs");
const request = require('request');
let token = '';

class Functions {
    constructor() {
    }
    getRealMac(){
        for (const v of Object.values(require('os').networkInterfaces())){
            if (v[0].mac !== '00:00:00:00:00:00'){
                return v;
            }
        }
        return false;
    }
    getAddress(arr){
        if (arr.constructor !== Array){
            return false;
        }
        const item =[];
        for (const v of arr){
            item.push(v.address);
        }
        return item;
    }
    getMac(arr){
        if (arr.constructor !== Array){
            return false;
        }
        const item =[];
        for (const v of arr){
            item.push(v.mac);
        }
        return item;
    }
    async verifyServer(code=''){
        const hash = md5(this.getMac(this.getRealMac()).join(''));
        if (code === ''){
            return false;
        }else {
            return hash;
        }
    }
    /**
     * 获取加密后的密码
     * Get the encrypted password
     * @param password {string}
     * @param salt {string}
     * @returns {string}
     */
     getPasswd(password ,salt){
        return  md5(`${password}${salt}`);
    }
    /**
     * 验证用户登录信息！
     * @param password {string}
     * @param user
     * @returns {boolean}
     */
     userAuthLogin(password ,user){
        // console.log(user);
        const passwd = this.getPasswd(password,user.salt);
        return passwd === user.password;
    }
    /**
     *
     * @param data
     */
    async log(data ,modules = `api`){
        const date = new Date((new Date().getTime()));
        // let month = (date.getMonth()+1);
        // month = month < 10 ? `0${month}` : `${month}`;
        const filename = process.cwd()+`/log/${modules}_${date.getFullYear()}_${(date.getMonth()+1)}_${date.getDate()}.txt`;
        fs.access(filename, fs.constants.F_OK, (err) => {

            if (err){
                fs.open(filename,'w+',(er, fd) => {
                    if (er) throw er;
                    fs.write(fd, `\n${JSON.stringify(data)}`,(e) => {
                        if (e) throw e;
                        fs.close(fd, () => {});
                    });
                });
            }else {
                fs.appendFile(filename,`\n${JSON.stringify(data)}`  ,'utf8', function(err) {
                    if(err) throw err ;
                })
            }
        });

    }
     endTime(time) {
        const nowTimeDate = new Date(time)
        return Math.floor((nowTimeDate.setHours(23, 59, 59, 999)) / 1000 );
    }
     startTime(time) {
        const nowTimeDate = new Date(time)
        return Math.floor((nowTimeDate.setHours(0, 0, 0, 0)) / 1000 );
    }
    async getOredersLine(){
        const item = [];
        let dayStart =this.startTime(new Date().getTime());
        let dayEnd =this.endTime(new Date().getTime());
        let dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 2));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 2));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 3));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 3));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 4));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 4));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 5));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 5));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 6));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 6));
        dbs = (await query(`SELECT count(*) as count FROM \`orders\` where \`status\`=2 and \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        return item.reverse();
    }
    async getUserLine(){
        const item = [];
        let dayStart =this.startTime(new Date().getTime());
        let dayEnd =this.endTime(new Date().getTime());
        let dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 2));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 2));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 3));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 3));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 4));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 4));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 5));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 5));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        dayStart =this.startTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 6));
        dayEnd =this.endTime((new Date().getTime()) - (1000 * 60 * 60 * 24 * 6));
        dbs = (await query(`SELECT count(*) as count FROM \`user\` where \`ctime\` > ${dayStart} and \`ctime\` < ${dayEnd}`))[0].count;
        item.push(dbs);

        return item.reverse();
    }
    getBankId(BankId){
        let bid = `${BankId}`;
        switch (bid.length) {
            case 1:
                bid = `K000${BankId}`
                break;
            case 2:
                bid = `K00${BankId}`
                break;
            case 3:
                bid = `K0${BankId}`
                break;
            case 4:
                bid = `K${BankId}`
                break;
        }
        return bid;
    }
    async printFiles(file, paths = {}){
        if (paths.from === undefined){
            paths.from = '';
        }else {
            if (!(await fs.existsSync(__dirname+paths.from))) {
                paths.from = '';
            }
        }
        if (paths.dest === undefined){
            paths.dest = '';
        }else {
            if (!(await fs.existsSync(process.cwd()+paths.dest))) {
                await fs.mkdirSync(process.cwd()+paths.dest);
            }
        }
        try {
            await fs.readFileSync(process.cwd()+paths.dest+file);
            // console.log(`目标文件已存在! file: ${process.cwd()+paths.dest+file}`);
        }catch (e) {
            // console.log(e)
            if (e.code === 'ENOENT'){
                try {
                    const data = await fs.readFileSync(__dirname+paths.from+file);
                    await fs.writeFileSync(process.cwd()+paths.dest+file, data);
                    console.log(`输出文件成功! file: ${process.cwd()+paths.dest+file}`);
                }catch (err) {
                    if (err.code === 'ENOENT'){
                        console.log(`需要输出的源文件不存在! file: ${paths.from+file}`);
                    }
                }
            }
        }
    }
    async outputFiles(paths){
        if (paths.constructor === Array){
            for (const path of paths){
                try {
                    const files = fs.readdirSync(__dirname+path);
                    for (const file of files){
                        await this.printFiles(`${path}/${file}`);
                    }
                }catch (e) {
                    if (e.code === 'ENOENT'){
                        console.log(`目录不存在！ ${path}`);
                    }
                }
            }
        }else if (paths.constructor === String){
            const files = fs.readdirSync(__dirname+paths);
            for (const file of files){
                await this.printFiles(`${paths}/${file}`);
            }
        }
    }
    async outputDir(dir){
        try {
            const stat = fs.lstatSync(__dirname + dir);
            if (stat.isDirectory()){
                if (!(await fs.existsSync(process.cwd()+dir))) {
                    await fs.mkdirSync(process.cwd()+dir);
                }
                const files = fs.readdirSync(__dirname + dir);
                for (const file of files){
                    await this.outputDir(`${dir}/${file}`);
                }
            }
            if (stat.isFile()){
                await this.printFiles(dir);
                // console.log(dir);
            }
        }catch (e) {
            // console.log(e);
        }
    }
    async generator() {
        const key = new NodeRSA({b: 512});
        key.setOptions({ encryptionScheme: 'pkcs1' })

        const privatePem = key.exportKey('pkcs1-private-pem');
        const publicPem = key.exportKey('pkcs1-public-pem');

        fs.writeFile(process.cwd()+'/public.pem', publicPem, (err) => {
            if (err) throw err
            console.log('公钥已保存！')
        })
        fs.writeFile(process.cwd()+'/private.pem', privatePem, (err) => {
            if (err) throw err
            console.log('私钥已保存！')
        })
    }
    /**
     * RSA加密
     * @param str
     * @returns {Promise<*|boolean>}
     */
    async encrypt(str) {
        try {
            const data = (await fs.readFileSync(__dirname+'/temp/private.pem')).toString();
            const key = new NodeRSA(data);
            return await key.encryptPrivate(str, 'base64');
        }catch (e) {
            // console.log(e);
            return false;
        }
    }
    /**
     * RSA解密
     * @param str
     * @returns {Promise<*|boolean>}
     */
    async decrypt(str) {
        try {
            const data = (await fs.readFileSync(__dirname+'/temp/public.pem')).toString();
            const key = new NodeRSA(data);
            return await key.decryptPublic(str, 'utf8');
        }catch (e) {
            // console.log(e.Error());
            return false;
        }
    }
    async getNewOrders(){
        return  await query(`SELECT * FROM \`orders\` WHERE \`status\`=0 OR \`status\`=5`);
    }
    async getNewOut(){
        return  await query(`SELECT * FROM \`outlook\` WHERE \`status\` = 1`);
    }
    getServerResponse(url ,data = null){
        return new Promise((resolve, reject) => {
            if (data === null){
                request({url: url, qs: {}}, function(err, response) {
                    if(err) { reject(err); return; }
                    resolve(response);
                });
            }else if (data.constructor === Object){
                request({
                    url: url,
                    method: "POST",
                    json: true,
                    headers: {
                        "content-type": "application/json",
                        "token"       : token
                    },
                    body: data
                }, function(error, response, body) {
                    if (error) reject(error);
                    resolve(body);
                });
            }else {
                reject({data: data, message: 'Error type of data'});
            }
        });
    }
}
let instFunctions = new Functions();
module.exports = instFunctions;
