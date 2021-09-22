const fs = require("fs"),
    path = require("path");
const functions = require('./functions');
/**
 * 删除文件夹功能
 * @param  {String} url  文件路径，绝对路径
 * @return {Null}
 * @author huangh 20170123
 */
let deleteDir = function (url){
    var files = [];

    if( fs.existsSync(url) ) {  //判断给定的路径是否存在

        files = fs.readdirSync(url);   //返回文件和子目录的数组
        files.forEach(function(file,index){
            var curPath = path.join(url,file);

            if(fs.statSync(curPath).isDirectory()) { //同步读取文件夹文件，如果是文件夹，则函数回调
                deleteDir(curPath);
            } else {
                fs.unlinkSync(curPath);    //是指定文件，则删除
            }

        });

        fs.rmdirSync(url); //清除文件夹
    }else{
        console.log("给定的路径不存在！");
    }

}
/**
 *
 * @param url {string}
 * @param name {string}
 */
let deleteFile = function (url,name){
    var files = [];

    if( fs.existsSync(url) ) {    //判断给定的路径是否存在

        files = fs.readdirSync(url);    //返回文件和子目录的数组

        files.forEach(function(file,index){

            var curPath = path.join(url,file);

            if(fs.statSync(curPath).isDirectory()) { //同步读取文件夹文件，如果是文件夹，则函数回调
                deleteFile(curPath,name);
            } else {

                if(file.indexOf(name)>-1){    //是指定文件，则删除
                    fs.unlinkSync(curPath);
                    functions.log({message: "删除文件", file: name, url:curPath, time: new Date().getTime()},'delete');
                }
            }
        });
    }else{
        functions.log({message: "给定的路径不存在", file: name, url:curPath, time: new Date().getTime()},'delete');
    }

}

module.exports =deleteFile, deleteDir;
