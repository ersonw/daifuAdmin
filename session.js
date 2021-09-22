const query =require('./dbs');

class Session {
    constructor() {
        this.users = new Map();
    }
    async addUser(sid, userId){
        await this.delUserBySid(sid);
        await this.delUserByUid(userId);
        const user = await query(`SELECT * FROM \`sys_user\` WHERE \`id\`='${userId}' and \`status\`=1`);
        if (user[0]){
            this.users.set(sid, user[0]);
            return true;
        }
        return false;
    }
    async delUserBySid(id){
        if (this.users.has(id)){
            this.users.delete(id)
        }
    }
    async delUserByUid(id){
        const sid = await this.getUserByUid(id);
        if (sid !== false){
            await this.delUserBySid(sid);
        }
    }
    async updateUser(id){
        if (this.users.has(id)){
            const sessionUser = this.users.get(id);
            const user = await query(`SELECT * FROM \`sys_user\` WHERE \`id\`='${sessionUser.id}' and \`status\`=1`);
            if (user[0]){
                this.users.set(id, user[0]);
            }else {
                await this.delUserBySid(id);
            }
        }
    }
    async getUserBySid(sid){
        await this.updateUser(sid);
        const user = this.users.get(sid);
        if (user === undefined){
            return false;
        }
        return user;
    }
    async getUserByUid(uid){
        for await (const v of this.users){
            const user = v[1];
            if (user.id === uid){
                return v[0];
            }
        }
        return false;
    }
}

let instSession = new Session();
module.exports = instSession;
