var app = require('../lib/app').default;
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

// load app module
var instance = new app({
  appPath: path.join(process.cwd(), 'node_modules'),
  devPath: process.cwd(),
  // 模块配置文件
  modules: config.modules || 'saas-plat-*',
  devModules: "*"
  // 模块配置文件
  querydb: config.querydb,
  eventdb: config.eventdb,
  systemdb: config.systemdb,
  // 服务
  roles: config.roles || [
    'web', 'app', 'task', 'workflow'
  ],
  debug: config.debug || true,
  logLevel: config.logLevel || 'ALL'
});
instance.compile({log: true});
instance.run();
