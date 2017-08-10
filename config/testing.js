require('babel-register');
require('babel-polyfill');
var app = require('../src/app').default;

// load app module
var instance = new app({
  appPath: __dirname + '/../../saas-plat-erp',
  // 模块配置文件
  modules: '*/*',
  codePath: 'src',
  port: 9900,
  eventdb: {
    url: 'mongodb://localhost:27017/testserver1_events'
  },
  eventmq: {
    name: 'eventqueue',
    port: 6379,
    host: 'localhost'
  },
  querydb: {
    username: 'root',
    password: '123456',
    database: 'testserver1_querys',
    host: 'localhost',
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    }
  },
  logLevel: 'All',
  // 服务
  roles: ['app', 'task', 'workflow']
  // ,debugOutput: true
});
instance.run().catch(function(err) {
  console.error(err);
});
