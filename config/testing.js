require ('babel-polyfill');
var app = require('../app').default;
var path = require('path');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(path.normalize(path.normalize(__dirname, '/../tenant.json'))));

// load app module
var instance = new app({
  appPath: path.normalize(path.normalize(__dirname, '/../node_modules'),
  devPath: path.normalize(path.normalize(__dirname,'/../demo'),
  // 模块配置文件
  modules: config.modules || 'saas-plat-*',
  devModules: "*"
  // 模块配置文件
  querydb: config.querydb,
  eventdb: config.eventdb,
  // 服务
  roles: config.roles || ['web', 'app', 'task', 'workflow'],
  debugOutput: true
});
instance.compile({
  log: true
});
instance.run();
