require('babel-register');
require('babel-polyfill');
var App = require('../src/app').default;

// load app module
var instance = new App({
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
  systemdb: {
    username: 'root',
    password: '123456',
    database: 'testserver1_sys',
    host: 'localhost',
    dialect: 'mysql'
  },
  logLevel: 'All'
  // ,debugOutput: true
});
instance.run().catch(function(err) {
  console.error(err);
});
