require('babel-polyfill');
var App = require('../lib/app').default;

module.exports = function(args) {
  var database = args.database || 'testdb',
    username = args.username || 'root',
    password = args.password || '',
    db = args.db,
    cfg = args.cfg;

  // 测试db全部配置成mysql
  var instance = new App(Object.assign({
    appPath: process.cwd(),
    modules: '*',
    codePath: 'src',
    eventBus: 'direct',
    // port: 9900,
    eventStoreage: {
      storage: 'mysql_domain_event',
      mysql: Object.assign({
        username: username,
        password: password,
        database: database,
        host: 'localhost',
        dialect: 'mysql'
      }, db)
    },
    snapshotStoreage: {
      storage: null // 禁用快照
    },
    datadb: Object.assign({
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql'
    }, db),
    systemdb: Object.assign({
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql'
    }, db),
    querydb: Object.assign({
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql'
    }, db),
    logLevel: 'All',
    // ,debugOutput: true
  }, cfg));
  return instance.test();
}
