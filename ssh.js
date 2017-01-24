'use strict'

// var ftp = module.exports;
var Client = require('ssh2').Client;
var path = require('path');

/** 
 * 描述：连接远程电脑 
 * 参数：server 远程电脑凭证；then 回调函数 
 * 回调：then(conn) 连接远程的client对象 
 */
function Connect(server, then) {
    var conn = new Client();
    conn.on("ready", function() {
        then(conn);
    }).on('error', function(err) {
        //console.log("connect error!");  
    }).on('end', function() {
        //console.log("connect end!");  
    }).on('close', function(had_error) {
        //console.log("connect close");  
    }).connect(server);
}

/** 
 * 描述：运行shell命令 
 * 参数：server 远程电脑凭证；cmd 执行的命令；then 回调函数 
 * 回调：then(err, data) ： data 运行命令之后的返回数据信息 
 */
function Shell(server, cmd, then) {
    Connect(server, function(conn) {
        conn.shell(function(err, stream) {
            if (err) {
                then(err);
            } else { // end of if  
                var buf = "";
                stream.on('close', function() {
                    conn.end();
                    then(err, buf);
                }).on('data', function(data) {
                    buf = buf + data;
                    console.log("stdout: " + data);
                }).stderr.on('data', function(data) {
                    console.log('stderr: ' + data);
                });
                stream.end(cmd);
            }
        });
    });
}

/** 
 * 描述：获取远程文件路径下文件列表信息 
 * 参数：server 远程电脑凭证； 
 *       remotePath 远程路径； 
 *       isFile 是否是获取文件，true获取文件信息，false获取目录信息； 
 *       then 回调函数 
 * 回调：then(err, dirs) ： dir, 获取的列表信息 
 */
function GetFileOrDirList(server, remotePath, isFile, then) {

    // var isFile = true;
    // var unInclucde = ['/v1.1/', '/api/', '/.svn/'];
    var cmd = "find " + remotePath + " -type " + (isFile == true ? "f" : "d") + "\r\nexit\r\n";
    Shell(server, cmd, function(err, data) {
        var arr = [];
        var remoteFile = [];
        arr = data.split("\r\n");
        arr.forEach(function(dir) {

            if (dir.indexOf(remotePath) == 0) {
                // unInclucde.forEach(function(extPath) {
                // if(extPath.indexOf(dir) !== 0) {
                remoteFile.push(dir);
                // }
                // });
            }
        });

        then(err, remoteFile);
    });
}

/** 
 * 描述：下载文件 
 * 参数：server 远程电脑凭证；remotePath 远程路径；localPath 本地路径；then 回调函数 
 * 回调：then(err, result) 
 */
function DownloadFile(server, remotePath, localPath, then) {
    Connect(server, function(conn) {
        conn.sftp(function(err, sftp) {
            if (err) {
                then(err);
            } else {
                sftp.fastGet(remotePath, localPath, function(err, result) {
                    if (err) {
                        then(err);
                    } else {
                        conn.end();
                        then(err, result);
                    }
                });
            }
        });
    });
}

function SvnUp(options) {
    Connect(options, function(conn) {
        conn.shell(function(err, stream) {
            if (err) throw err;
            stream.on('close', function() {
                console.log('Stream :: close');
                conn.end();
            }).on('data', function(data) {
                console.log('STDOUT: ' + data);
            }).stderr.on('data', function(data) {
                console.log('STDERR: ' + data);
            });
            stream.end('cd /data/html/myhome/ \nsvn up\n \nexit\n');
            // stream.end('svn up \nexit\n');
            // stream.end('ls -l\nexit\n');
        });
    });
}

SvnUp({
    'port': 22,
    'host': '127.0.0.1',
    'user': 'test',
    'password': 'test'
});

SvnUp({
    'port':  22,
    'host': '127.0.0.1',
    'user': 'test',
    'password': 'test'
});
