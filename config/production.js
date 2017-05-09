var app = require('../app').default;
var path = require('path');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(path.normalize(path.join(process.cwd(), 'package.json'))));

// load app module
var instance = new app({
  appPath: path.normalize('node_modules'),
  // 模块配置文件
  modules: config.modules,
  // 模块配置文件
  db: config.db,
  // 服务
  roles: config.roles || ['web', 'app', 'task', 'mq', 'workflow']
});
instance.run();
