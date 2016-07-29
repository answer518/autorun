'use strict'
const http = require('http')
const path = require('path')
const url = require('url')
const util = require('util')
const fs = require('fs')
const superagent = require('superagent')
const cheerio = require('cheerio')


const events = require("events")
const emitter = new events.EventEmitter()

function setCookeie() {
    superagent.post('http://mx5.maxthon.net/index.php?m=user&f=login') //学校里的一个论坛，这是登录提交地址
        .type("form")
        .send({ account: "guotingjie" }) //这肯定不是我真的用户名和密码啦
        .send({ password: "guotingjie" })
        .send({ referer: "http://mx5.maxthon.net/index.php?m=my&f=task" })
        .end(function(err, res) {
            if (err) throw err;
            var cookie = res.header['set-cookie'] //从response中得到cookie

            emitter.emit("setCookeie", cookie);
        })
}

var mkfield = function (field, value) {
  return util.format('Content-Disposition: form-data; name="%s"\r\n\r\n%s', field, value);
}

setCookeie();
emitter.on("setCookeie", getMytask); //监听setCookeie事件

function getMytask(cookie) {

    superagent.get('http://mx5.maxthon.net/index.php?m=my&f=task')
        .set("Cookie", cookie[2])
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text)

            let now = new Date().Format("yyyy-MM-dd");
            console.log('now : ' + now);

            $('#myTaskForm').find('tbody>tr').each((index, item) => {

                if ($(item).find('td').eq(11).text() === '已完成') {
                    return true;
                }

                var taskID = $(item).find('td').eq(0).find('a').text();
                var taskName = $(item).find('td').eq(3).find('a').text();
                if($(item).find('td').eq(11).text() === '未开始') {

                    startMytask(cookie, taskID, taskName);
                    return true;
                }

                let finishDate = $(item).find('td').eq(10).text();
                if(now === finishDate) {
               
                    var finishHour = $(item).find('td').eq(7).text();

                    closeMytask(cookie, taskID, taskName, finishDate, finishHour);
                }

            });
        });
};

//post值payload
var getfield=function(field, value) {
    return 'Content-Disposition: form-data; name="'+field+'"\r\n\r\n'+value+'\r\n';
}

//文件payload
var getfieldHead=function (field, filename) {
    var fileFieldHead='Content-Disposition: form-data; name="files[]"; filename="'+filename+'"\r\n'+'Content-Type: '+getMime(filename)+'\r\n\r\n\r\n';
    return fileFieldHead;
}
//获取Mime
var getMime=function (filename) {
    var mimes = {
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.js': 'appliction/json',
        '.torrent': 'application/octet-stream'
    };
    var ext = path.extname(filename);
    var mime = mimes[ext];
    mime=!!mime?mime:'application/octet-stream';
    return mime;
}
//获取边界检查随机串
var getBoundary=function() {
    var max = 9007199254740992;
    var dec = Math.random() * max;
    var hex = dec.toString(36);
    var boundary = hex;
    return boundary;
}
//获取boundary
var getBoundaryBorder=function (boundary) {
    return '--'+boundary+'\r\n';
}

//字段格式化
function fieldPayload(opts) {
    var payload=[];
    for(var id in opts.field){
        payload.push(getfield(id,opts.field[id]));
    }

    // payload.push("");
    return payload.join(getBoundaryBorder(opts.boundary));
}

function getMytaskById(cookie, taskID) {
    superagent.get('http://mx5.maxthon.net/index.php?m=task&f=edit&taskID=' + taskID)
        .set("Cookie", cookie[2])
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text);

            let dataform = $('#dataform');
            var options = {
                'url' : 'http://mx5.maxthon.net/index.php?m=task&f=edit&taskID=' + taskID,
                "file":"",
                "filename": "",
                "param":"file",
                'cookie':cookie,
                "field":{ //其余post字段
                    'name' : dataform.find('#name').val(),
                    'desc' : dataform.find('#desc').val(),
                    'comment' : dataform.find('#comment').val(),
                    // 'files[]' : '',
                    'labels[]' : '', 
                    'consumed' : '1',
                    'project' : dataform.find('#project').val(),
                    'module' : dataform.find('#module').val(),
                    'story' : '',
                    'assignedTo' : dataform.find('#assignedTo').val(),
                    'type' : dataform.find('#type').val(),
                    'status' : dataform.find('#status').val(),
                    'pri' : dataform.find('#pri').val(),
                    'mailto[]' : '',
                    'estStarted' : dataform.find('#estStarted').val(),
                    'realStarted' : dataform.find('#realStarted').val(),
                    'deadline' : dataform.find('#deadline').val(),
                    'estimate' : dataform.find('#estimate').val(),
                    'left' : dataform.find('#left').val(),
                    'finishedBy' : dataform.find('#finishedBy').val(),
                    'finishedDate' : dataform.find('#finishedDate').val(),
                    'canceledBy' :dataform.find('#canceledBy').val(),
                    'canceledDate' : dataform.find('#canceledDate').val(),
                    'closedBy' : dataform.find('#closedBy').val(),
                    'closedReason' : dataform.find('#closedReason').val(),
                    'closedDate' : dataform.find('#closedDate').val()
                },
                "boundary":"---------------------------WebKitFormBoundary"+getBoundary()
            };
            
            console.log(options);
            return false;
            postRequest(options);
        });
}

//post数据
function postRequest (opts, fn) {

        var options = url.parse(opts.url);

        var h=getBoundaryBorder(opts.boundary);
        var e=fieldPayload(opts);
        var a=getfieldHead(opts.param,opts.filename);
        var d= '--'+opts.boundary + "--";

        var body = h+e+a+d;

        options.headers= {
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'multipart/form-data; boundary='+opts.boundary,
            'Cookie': (opts.cookie)[2],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language' : 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            'Connection' : 'keep-alive'
        };
        options.method='POST';

        console.log(body);
        return false;
        var req=http.request(options,function(res){
            var data='';
            res.on('data', function (chunk) {
                data+=chunk;
            });
            res.on('end', function () {
                fn && fn(res.statusCode);
            });
        });
        req.end(body);
}

function closeMytask(cookie, taskID, taskName,finishDate, finishHour) {

    superagent.get('http://mx5.maxthon.net/index.php?m=task&f=finish&taskID=' + taskID + '&onlybody=yes')
        .set("Cookie", cookie[2]) //在resquest中设置得到的cookie
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text);

            var options = {
                'url' : 'http://mx5.maxthon.net/index.php?m=task&f=finish&taskID=' + taskID + '&onlybody=yes',
                "file":"",
                "filename": "",
                "param":"file",
                'cookie':cookie,
                "field":{ //其余post字段
                    'comment' : $('#comment').val(),
                    'labels[]' : '', 
                    'consumed' : finishHour,
                    'assignedTo' : $('#assignedTo').val(),
                    'finishedDate' : $('#finishedDate').val()
                    
                },
                "boundary":"---------------------------WebKitFormBoundary"+getBoundary()
            };

            postRequest(options, function(resCode) {

                if(resCode == '200') {
                    console.log('任务【' + taskID + '】' + taskName + ' 完成了!');
                }
            });
        });
}

function startMytask(cookie, taskID, taskName) {

    superagent.get('http://mx5.maxthon.net/index.php?m=task&f=start&taskID=' + taskID + '&onlybody=yes')
        .set("Cookie", cookie[2]) //在resquest中设置得到的cookie
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text);

            var options = {
                'url' : 'http://mx5.maxthon.net/index.php?m=task&f=start&taskID=' + taskID + '&onlybody=yes',
                "file":"",
                "filename": "",
                "param":"file",
                'cookie':cookie,
                "field":{ //其余post字段
                    'comment' : $('#comment').val(),
                    'consumed' : '0',
                    'left' : $('#left').val(),
                    'realStarted' : $('#realStarted').val()
                },
                "boundary":"---------------------------WebKitFormBoundary"+getBoundary()
            };

            postRequest(options, function(resCode) {

                if(resCode == '200') {
                    console.log('任务【' + taskID + '】' + taskName + ' 已经正确的启动!');
                }
            });
        });
}

Date.prototype.Format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}