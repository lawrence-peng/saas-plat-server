require('babel-polyfill');
var app = require('../lib/app').default;
var path = require('path');
var fs = require('fs');
var args = process.args.splice(2);

var config
var configfile = path.normalize(path.join(process.cwd(), 'tenant.json'));
if (fs.existsSync(configfile)) {
  console.log(configfile)
  config = JSON.parse(fs.readFileSync(configfile));
} else {
  console.warn('无法加载config', configfile)
}

var run = function(cfg) {
  // load app module
  var instance = new app(Object.assign({
    appPath: path.join(process.cwd(), 'node_modules'),
    // 模块配置文件
    modules: 'saas-plat-*',
    // 模块配置文件
    logLevel: 'INFO'
  }, cfg));
  instance.run().catch(function(err) {
    console.error(err);
  });
}

if (args.indexOf('--saasplat') > -1) {
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
