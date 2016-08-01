'use strict'
const http = require('http')
const path = require('path')
const url = require('url')
const util = require('util')
const superagent = require('superagent');
const cheerio = require('cheerio');

// lib
var date = require('./date');

//exports
var Task = module.exports = {};

Task.login = function(opts, callback) {
	superagent.post(opts.url) //这是登录提交地址
        .type("form")
        .send({ account: opts.account }) //这肯定不是我真的用户名和密码
        .send({ password: opts.password })
        .send({ referer: opts.referer })
        .end(function(err, res) {
            if (err) throw err;
            var cookie = res.header['set-cookie'] //从response中得到cookie

            callback && callback(cookie);
        });
}

/**
 * 任务列表
 * @param  {[cookie]}
 * @return {[none]}
 */
Task.list = function(cookie) {

    // closeMytask(cookie, '8775', '新标签页beta2.0需求讨论', '2016-07-29', '3');
    // getMytaskById(cookie,'8775');
    // return false;
    superagent.get('http://mx5.maxthon.net/index.php?m=my&f=task')
        .set("Cookie", cookie[2])
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text)

            let now = date.today();
            console.log('now : ' + now);

            $('#myTaskForm').find('tbody>tr').each((index, item) => {

                let status = $(item).find('td').eq(11).text();
                if(status === '已完成') {
                    return true;
                }

                let taskID = $(item).find('td').eq(0).find('a').text();
                let taskName = $(item).find('td').eq(3).find('a').text();
                let finishDate = $(item).find('td').eq(10).text();
                if(status === '未开始') {

                    Task.start(cookie, taskID, taskName);


                    return true;
                }

                if(now === finishDate) {
               
                    var finishHour = $(item).find('td').eq(7).text();

                    Task.close(cookie, taskID, taskName, finishDate, finishHour);
                    return true;
                }

                // console.log(taskID + '  ' + taskName);

            });
        });
};

// Task.getMytaskById = function(cookie, taskID) {
//     superagent.get('http://mx5.maxthon.net/index.php?m=task&f=edit&taskID=' + taskID)
//         .set("Cookie", cookie[2])
//         .end((err, response) => {

//             if (err) console.log(err)
//             let $ = cheerio.load(response.text);

//             let dataform = $('#dataform');
//             var options = {
//                 'url' : 'http://mx5.maxthon.net/index.php?m=task&f=edit&taskID=' + taskID,
//                 "file":"",
//                 "filename": "",
//                 "param":"file",
//                 'cookie':cookie,
//                 "field":{ //其余post字段
//                     'name' : dataform.find('#name').val(),
//                     'desc' : dataform.find('#desc').val(),
//                     'comment' : dataform.find('#comment').val(),
//                     // 'files[]' : '',
//                     'labels[]' : '', 
//                     'consumed' : '1',
//                     'project' : dataform.find('#project').val(),
//                     'module' : dataform.find('#module').val(),
//                     'story' : '',
//                     'assignedTo' : dataform.find('#assignedTo').val(),
//                     'type' : dataform.find('#type').val(),
//                     'status' : dataform.find('#status').val(),
//                     'pri' : dataform.find('#pri').val(),
//                     'mailto[]' : '',
//                     'estStarted' : dataform.find('#estStarted').val(),
//                     'realStarted' : dataform.find('#realStarted').val(),
//                     'deadline' : dataform.find('#deadline').val(),
//                     'estimate' : dataform.find('#estimate').val(),
//                     'left' : dataform.find('#left').val(),
//                     'finishedBy' : dataform.find('#finishedBy').val(),
//                     'finishedDate' : dataform.find('#finishedDate').val(),
//                     'canceledBy' :dataform.find('#canceledBy').val(),
//                     'canceledDate' : dataform.find('#canceledDate').val(),
//                     'closedBy' : dataform.find('#closedBy').val(),
//                     'closedReason' : dataform.find('#closedReason').val(),
//                     'closedDate' : dataform.find('#closedDate').val()
//                 },
//                 "boundary":"---------------------------WebKitFormBoundary"+getBoundary()
//             };

//             postRequest(options, function(statusCode) {

//             });
//         });
// }

/**
 * 任务关闭
 * @param  {[cookie]}
 * @param  {[taskID]}
 * @param  {[taskName]}
 * @param  {[finishDate]}
 * @param  {[finishHour]}
 * @return {[none]}
 */
Task.close = function(cookie, taskID, taskName, finishDate, finishHour) {

    let url = 'http://mx5.maxthon.net/index.php?m=task&f=finish&taskID=' + taskID + '&onlybody=yes';
    superagent.get(url)
        .set("Cookie", cookie[2]) //在resquest中设置得到的cookie
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text);

            var options = {
                'url': url,
                'cookie': cookie,
                "field": { //其余post字段
                    'comment': $('#comment').val(),
                    'labels[]': '',
                    'consumed': finishHour,
                    'assignedTo': $('#assignedTo').val(),
                    'finishedDate': $('#finishedDate').val()

                }
            };

            postRequest(options, function(resCode) {

                if (resCode == '200') {
                    console.log('任务【' + taskID + '】' + taskName + ' 完成了!');
                }
            });
        });
}

/**
 * 任务启动
 * @param  {[cookie]}
 * @param  {[taskID]}
 * @param  {[taskName]}
 * @return {[none]}
 */
Task.start = function(cookie, taskID, taskName) {

    superagent.get('http://mx5.maxthon.net/index.php?m=task&f=edit&taskID=' + taskID)
        .set("Cookie", cookie[2]) //在resquest中设置得到的cookie
        .end((err, response) => {

            if (err) console.log(err)
            let $ = cheerio.load(response.text);

            // 任务预计开始时间如果是下一个工作日, 则启动任务
            if($('#estStarted').val() === date.nextDay()) {
                 let options = {
                    'url': 'http://mx5.maxthon.net/index.php?m=task&f=start&taskID=' + taskID + '&onlybody=yes',
                    'cookie': cookie,
                    "field": { //其余post字段
                        'comment': $('#comment').val(),
                        'consumed': '0',
                        'left': $('#left').val(),
                        'realStarted': $('#realStarted').val()
                    }
                };

                postRequest(options, function(resCode) {

                    if (resCode == '200') {
                        console.log('任务【' + taskID + '】' + taskName + ' 已经正确的启动!');
                    }
                });
            }

        });
}

/**
 * @description 发送post请求
 * @param  {[opts]}
 * @param  {fn}
 * @return {[none]}
 */
function postRequest(opts, fn) {

    opts['file'] = '';
    opts['filename'] = '';
    opts['param'] = '';
    opts['boundary'] = '---------------------------WebKitFormBoundary' + getBoundary();

    let request_body = requestBody(opts);

    let header_options = url.parse(opts.url);
    header_options.headers = {
        'Content-Length': Buffer.byteLength(request_body),
        'Content-Type': 'multipart/form-data; boundary=' + opts.boundary,
        'Cookie': (opts.cookie)[2],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Connection': 'keep-alive'
    };
    header_options.method = 'POST';

    // console.log(body);
    // return false;
    var req = http.request(header_options, function(res) {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            fn && fn(res.statusCode);
        });
    });

    req.end(request_body);
}

/**
 * 请求body主体
 * @param  {[opts]}
 * @return {[type]}
 */
function requestBody(opts) {

    let h = getBoundaryBorder(opts.boundary);
    let e = fieldPayload(opts);
    let a = getfieldHead(opts.param, opts.filename);
    let d = '--' + opts.boundary + "--";

    return h + e + a + d;
}

function mkfield(field, value) {
  return util.format('Content-Disposition: form-data; name="%s"\r\n\r\n%s', field, value);
}
//post值payload
function getfield(field, value) {
    return 'Content-Disposition: form-data; name="' + field + '"\r\n\r\n' + value + '\r\n';
}

//文件payload
function getfieldHead(field, filename) {
    var fileFieldHead = 'Content-Disposition: form-data; name="files[]"; filename="' + filename + '"\r\n' + 'Content-Type: ' + getMime(filename) + '\r\n\r\n\r\n';
    return fileFieldHead;
}
//获取Mime
function getMime(filename) {
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
    mime = !!mime ? mime : 'application/octet-stream';
    return mime;
}

//获取边界检查随机串
function getBoundary() {
    var max = 9007199254740992;
    var dec = Math.random() * max;
    var hex = dec.toString(36);
    var boundary = hex;
    return boundary;
}

//获取boundary
function getBoundaryBorder(boundary) {
    return '--' + boundary + '\r\n';
}

//字段格式化
function fieldPayload(opts) {
    var payload = [];
    for (var id in opts.field) {
        payload.push(getfield(id, opts.field[id]));
    }

    payload.push("");
    return payload.join(getBoundaryBorder(opts.boundary));
}