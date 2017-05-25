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

var modules = [];
for (var i = 0; i < args.length; i++) {
  if (args[i].sbustr(0, 2) != '--') {
    modules.push(args[i]);
  }
}

if (modules.length > 0) {
  var run = function (cfg) {
    var instance = new app({
      appPath: path.join(process.cwd(), 'node_modules'),
      // 模块配置文件
      modules: modules.length > 1 ?
        modules :
        modules.length == 1 ?
        modules[0] :
        [],
      // 模块配置文件
      querydb: cfg.querydb,
      eventdb: cfg.eventdb,
      systemdb: cfg.systemdb
    });
    instance.migrate();
  }

  if (args.indexOf('--saasplat')) {
    // 启用了平台部署模式
    if (config && !config.id) {
      console.warn('config文件无效');
    } else {
      fetch('http://internal.saas-plat.com/tenant?id=' + config.id).then(rep => rep.json()).then(json => {
        run(json);
      });
    }
  } else {
    if (config) {
      run(config);
    }
  }
} else {
  console.log('node ./config/update.js [--saas-plat] module1 module2')
}
