import Sequelize from 'sequelize';
import {sysdbLogger as logger} from './util/log';
import i18n from './i18n';

let _db;

export function db() {
  if (_db) {
    throw new Error(500, i18n.t('系统库尚未连接'));
  }
  return _db;
}

export async function connect(sysdb) {
  if (_db) {
    throw new Error(403, i18n.t('系统库已经连接'));
  }
  const {
    database = 'saasplat_system',
    username = 'root',
    password = '',
    ...options
  } = (sysdb || {});
  _db = new Sequelize(database, username, password, {
    ...options,
    logging: (...args) => {
      logger.debug(...args);
    }
  });
  // 检查是否能连接
  await _db.authenticate();
  return _db;
};
