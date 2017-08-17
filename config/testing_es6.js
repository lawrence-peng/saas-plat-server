var App = require('../src/app').default;

module.exports = async function(args) {
  var {
    database = 'testdb',
      username = 'root',
      password = '',
      db,
      ...cfg
  } = (args || {});
  // 测试db全部配置成mysql
  var instance = new App({
    appPath: process.cwd(),
    modules: '*',
    codePath: 'src',
    eventBus: 'direct',
    // port: 9900,
    eventStoreage: {
      storage: 'mysql_domain_event',
      mysql: {
        username: username,
        password: password,
        database: database,
        host: 'localhost',
        dialect: 'mysql',
        ...db
      }
    },
    snapshotStoreage: {
      storage: null // 禁用快照
    },
    datadb: {
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql',
      ...db
    },
    systemdb: {
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql',
      ...db
    },
    querydb: {
      username: username,
      password: password,
      database: database,
      host: 'localhost',
      dialect: 'mysql',
      ...db
    },
    logLevel: 'All',
    // ,debugOutput: true
    ...cfg
  });
  await instance.test();
}
