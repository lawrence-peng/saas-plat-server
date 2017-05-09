/**
 * db config
 * @type {Object}
 */
export default {
  type: 'mysql',
  adapter: {
    mysql: {
      host: 'localhost',
      port: '',
      database: 'saasplat_server1_db',
      user: 'root',
      password: '123456',
      encoding: 'utf8',
      pool: {
        max: 5,
        min: 0,
        idle: 10000
      }
    }
  }
};
