require('babel-register');
require('babel-polyfill');
var app = require('../src/app').default;
var path = require('path');
var fs = require('fs');

var config
var configfile = path.normalize(path.join(__dirname, '../tenant.json'));
if (fs.existsSync(configfile)) {
  config = JSON.parse(fs.readFileSync(configfile));
} else {
  console.warn('无法加载config', configfile)
}

// load app module
var instance = new app(Object.assign({
  appPath: path.normalize(path.join(__dirname, '/../demo')),
  devPath: path.normalize(path.join(__dirname, '/../demo')),
  // 模块配置文件
  modules: '*',
  //,debugOutput: true
}, config));

instance.compile({
  log: true
});
instance.run().catch(function(err) {
  console.error(err);
});
