var app = require('./app').default;
var path = require('path');

exports.run = function(){
  // load app module
  var instance = new app({
    // 开发模式动态编译
    appPath : path.join(__dirname, '..', '..', 'apps'),
    debug: true,
    roles: ['web','app','task','mq','workflow']
    //debugOutput: true
  });
  instance.compile({
    log: true
  });
  instance.run();
};
