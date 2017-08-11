var app = require('../lib/app').default;
var path = require('path');
var fs = require('fs');

var configfile = path.normalize(path.join(process.cwd(), 'development.json'));
if (!fs.existsSync(configfile)) {
  console.warn('无法加载开发配置信息，必须提供一个配置文件', configfile);
  console.log('更多信息', 'https://github.com/saas-plat/saas-plat-server');
} else {
  var config = JSON.parse(fs.readFileSync(configfile));
  // load app module
  var instance = new app(Object.assign({
    appPath: path.join(process.cwd(), 'node_modules'),
    devPath: path.dirname(process.cwd()),
    // 模块配置文件
    modules: 'saas-plat-*',
    devModules: path.basename(process.cwd()),
    debug: true,
    logLevel: 'INFO'
  }, config));
  instance.compile({ log: true });
  instance.run().catch(function(err) {
    console.error(err);
  });
}
