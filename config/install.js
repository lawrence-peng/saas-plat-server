require('babel-polyfill');
var app = require('../app').default;
var path = require('path');
var fs = require('fs');

var config
var configfile = path.normalize(path.join(process.cwd(), 'tenant.json'));
if (fs.existsSync(configfile)) {
  console.log(configfile)
  config = JSON.parse(fs.readFileSync(configfile));
} else {
  console.warn('无法加载config', configfile)
}

var args = process.args.splice(2);

// load app module
var instance = new app({
  appPath: path.join(process.cwd(), 'node_modules'),
  // 模块配置文件
  modules: args.length > 1
    ? args
    : args.length == 1
      ? args[0]
      : config.modules,
  // 模块配置文件
  querydb: config.querydb
});
instance.migrate();
