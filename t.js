const fs = require("fs");
const NodeRSA = require('node-rsa');
const chinaTime = require('china-time');
const c = require('child_process');

function t(a,b) {
    console.log(a+b);
}
(async () => {

    const tryTime = (1632325095833 + 1000 * 7);
    const tryDay = new Date(tryTime);
    console.log(`试用到期时间为 ${tryDay.getFullYear()}-${tryDay.getMonth() + 1}-${tryDay.getDate()} ${tryDay.setHours()}:${tryDay.getMinutes()}:${tryDay.getSeconds()}`);
    setInterval(function(){
        console.log(`试用到期时间为 ${new Date(tryTime).getFullYear()}-${new Date(tryTime).getMonth() + 1}-${new Date(tryTime).getDate()} ${new Date(tryTime).getHours()}:${new Date(tryTime).getMinutes()}:${new Date(tryTime).getSeconds()}`);
        const now = chinaTime().getTime();
        if (now > tryTime){
            c.exec(`start taskkill /f /PID ${ process.pid }`);
        }
    }, 1000 * 2);
})()
