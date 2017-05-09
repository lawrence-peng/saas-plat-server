var thinkjs = require('thinkjs');
var path = require('path');

var rootPath = path.dirname(__dirname) + path.sep + 'thinkjs';

var instance = new thinkjs({
  APP_PATH: rootPath + path.sep + 'app',
  RUNTIME_PATH: path.dirname(__dirname) + path.sep + 'runtime',
  ROOT_PATH: rootPath,
  RESOURCE_PATH: rootPath + path.sep + 'www',
  env: 'development'
});

//compile src/ to app/
// instance.compile({
//   log: true
// });

export default instance;
