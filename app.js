'use strict'

const events = require("events")
const emitter = new events.EventEmitter()

const task = require('./task');

task.login({
    'url' : 'http://mx5.maxthon.net/index.php?m=user&f=login',
    'account' : 'guotingjie',
    'password' : 'guotingjie',
    'referer' : 'http://mx5.maxthon.net/index.php?m=my&f=task'
}, function(cookie) {
    emitter.emit("setCookeie", cookie);
});

emitter.on("setCookeie", task.list); //监听setCookeie事件