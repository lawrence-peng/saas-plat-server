var thinkjs = require('thinkjs');
var path = require('path');

var rootPath = __dirname + path.sep + 'mvc';

var instance = new thinkjs({
  APP_PATH: rootPath ,
  RUNTIME_PATH: path.dirname(__dirname) + path.sep + 'runtime',
  ROOT_PATH: rootPath,
  RESOURCE_PATH: path.dirname(__dirname) + path.sep + 'www',
  env: 'production' //'development'
});

// 需要加载类型
instance.start();

export const app = instance;

export default think;
