const http = require('https');
const fs = require('fs');
const functions = require('./functions');

let downloadFile = function(uri, dest, cb){
    // 确保dest路径存在
    const file = fs.createWriteStream(dest);

    http.get(uri, (res)=>{
        if(res.statusCode !== 200){
            cb(res.statusCode);
            return;
        }

        res.on('end', ()=>{
            //console.log('download end');
        });

        // 进度、超时等

        file.on('finish', ()=>{
            //console.log('finish write file')
            file.close(cb);
        }).on('error', (err)=>{
            fs.unlink(dest);
            if(cb) cb(err.message);
        })

        res.pipe(file);
    });
}
/**
 *
 * @param uri
 * @param dest
 * @returns {Promise<resolve>}
 */
let downloadFileAsync = function(uri, dest){

    return new Promise((resolve)=>{
        if( fs.existsSync(uri) ) {
            functions.log({message: `文件已存在！`, uri:uri, file: dest, time: new Date().getTime()},'downloads');
            resolve({errorMessage: `${dest} 文件已存在！`,code: 400});
            return;
        }
        // 确保dest路径存在
        const file =  fs.createWriteStream(dest);
        http.get(uri, (res)=>{
            if(res.statusCode !== 200){
                resolve(res.statusCode);
                return;
            }

            res.on('end', ()=>{
                functions.log({message: `download end file`, uri:uri, file: dest, time: new Date().getTime()},'downloads');
            });

            // 进度、超时等

            file.on('finish', ()=>{
                functions.log({message: `finish write file`, uri:uri, file: dest, time: new Date().getTime()},'downloads');
                file.close(resolve);
            }).on('error', (err)=>{
                functions.log({message: `error write file`, uri:uri, file: dest, time: new Date().getTime()},'downloads');
                fs.unlink(dest);
                resolve(err.message);
            })

            res.pipe(file);
        });
    });
}
module.exports =  downloadFileAsync, downloadFile;
