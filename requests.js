const requestSync = require("request");

let synchronous_post = function (url, params) {

    let options = {
        url: url,
        form: params
    };

    return new Promise(function (resolve, reject) {
        requestSync.get(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}
let syncBody = async function (url) {
    // let url = "http://www.baidu.com/";
    var url = url;
    let body = await synchronous_post(url);
    // console.log('##### BBBBB', body);
    return JSON.parse(body);
}
var body = syncBody(url);	//函数外部使用

// 在其他函数内部使用
async function funcName(url){
    var body = await syncBody(url);
    console.log(body);
}
