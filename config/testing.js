var app = require('./app').default;
var path = require('path');

var rootPath = path.dirname(__dirname);

exports.run = function(roles){
  // load app module
  var instance = new app({
    rootPath: rootPath,
    appPath : rootPath + path.sep + 'apps',
    debug: true,
    roles: roles
  });
  instance.run();
};
