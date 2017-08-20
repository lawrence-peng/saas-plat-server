import path from 'path';
import fs from 'fs';
import Sequelize from 'sequelize';
import i18n from './util/i18n';
import {ormLogger as logger} from './util/log';
import Installs from './util/installs';
import {cmpVer, lastChild, getClassName} from './util/common';

const _data = {
  alias: {},
  export: {},
  defines: {},
  db: null
};

const _dirname = {
  model: 'model',
  migration: 'datamigration'
};

const getFiles = (file) => {
  let dirs = [];
  if (fs.existsSync(file)) {
    let files = fs.readdirSync(file);
    for (var fi of files) {
      if (fs.statSync(path.join(file, fi)).isFile())
        dirs.push(fi);
      }
    }
  return dirs;
};

// 定义别名
const alias = (type, paths) => {
  if (!type) {
    return _data.alias;
  }
  //regist alias
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  paths.forEach(dir => {
    let files = getFiles(dir);
    files.forEach(file => {
      if (file.slice(-3) !== '.js' || file[0] === '_') {
        return;
      }
      let name = file.slice(0, -3).replace(/\\/g, '/'); //replace \\ to / on windows
      name = type + '/' + name;
      _data.alias[name] = `${dir}${path.sep}${file}`;
    });
  });
};

let _interopSafeRequire = file => {
  let obj = require(file);
  if (obj && obj.__esModule && obj.default) {
    return obj.default;
  }
  return obj;
};

let _safeRequire = file => {
  // absolute file path is not exist
  if (path.isAbsolute(file)) {
    //no need optimize, only invoked before service start
    if (!fs.statSync(file).isFile()) {
      return null;
    }
    //when file is exist, require direct
    return _interopSafeRequire(file);
  }
  try {
    return _interopSafeRequire(file);
  } catch (err) {
    logger.error(err);
  }
  return null;
};

let _loadRequire = (name, filepath) => {
  let obj = _safeRequire(filepath);
  if (typeof obj === 'function') {
    obj.prototype.__type = name;
    obj.prototype.__filename = filepath;
  }
  if (obj) {
    _data.export[name] = obj;
  }
  return obj;
};

// 通过别名加载类型
const _require = (name, flag) => {
  if (typeof name != 'string') {
    return name;
  }
  // adapter or middle by register
  let Cls = _data.export[name];
  if (!Cls) {
    let filepath = _data.alias[name];
    if (filepath) {
      return _loadRequire(name, path.normalize(filepath));
    }
    // only check in alias
    if (flag) {
      return null;
    }
    filepath = require.resolve(name);
    Cls = _loadRequire(name, filepath);
    if (!Cls) {
      return null;
    }
  }
  return Cls;
};

const define = (module, name, schame, options) => {
  if (!module) {
    const mn = name.split('/');
    if (mn.length == 2) {
      module = mn[0];
      name = mn[1];
    }
  }
  if (!module) {
    throw new Error(i18n.t('查询对象无效，模块未指定'));
  }
  const Model = _data.db.define(module + '_' + name, schame, {
    ...options,
    tableName: module + '_' + name
  });
  return Model;
};

const get = (module, name) => {
  if (!name) {
    throw new Error(i18n.t('查询对象未找到'));
  }
  if (!module) {
    throw new Error(i18n.t('查询对象未找到，模块未知'));
  }
  const modelAlias = `${module}/model/${name}`;
  if (modelAlias in _data.defines) {
    return _data.defines[modelAlias];
  }
  try {
    if (!(modelAlias in _data.alias)) {
      logger.debug(i18n.t('查询对象不存在'), `${module}/${name}`);
      return null;
    }
    const modelType = _require(_data.alias[modelAlias]);
    if (!modelType) {
      logger.warn(i18n.t('查询对象加载失败'), `${module}/${name}`);
      return null;
    }
    const modelInst = new modelType;
    if (typeof modelInst.schame != 'function') {
      logger.warn(i18n.t('查询对象schame未定义'), `${module}/${name}`);
    }
    _data.defines[modelAlias] = define(module, name, typeof modelInst.schame == 'function'
      ? modelInst.schame()
      : (modelInst.schame || {}), typeof modelInst.options == 'function'
      ? modelInst.options()
      : (modelInst.options || {}));
    return _data.defines[modelAlias];
  } catch (e) {
    logger.warn(e);
    throw new Error(i18n.t('查询对象不存在'));
  }
}

const createModel = async(Model, force = false) => {
  const modelInst = new Model;
  const model = define(modelInst.__type.split('/')[0], modelInst.__type.split('/')[2], typeof modelInst.schame == 'function'
    ? modelInst.schame()
    : {}, typeof modelInst.options == 'function'
    ? modelInst.options()
    : {});
  if (model) {
    // force = drop and create
    await model.sync({force});
    // todo 执行升级脚本
    logger.debug(i18n.t('表已创建'), model.name);
  }
};

const createModels = async(model, force = false) => {
  if (model.__esModule) {
    for (let p in model) {
      if (model.hasOwnProperty(p)) {
        await createModel(model[p], force);
      }
    }
  } else {
    await createModel(model, force);
  }
};

const create = async(modules, name, force = false) => {
  logger.debug(i18n.t('开始重建数据表...'));
  for (let module of modules) {
    if (name) {
      await createModel(_require(`${module}/model/${name}`), force);
    } else {
      const models = Object.keys(_data.alias).filter(item => item.indexOf(`${module}/model/`) > -1);
      if (models.length <= 0) {
        logger.warn(i18n.t('未加载任何模型定义'));
      }
      for (const item of models) {
        await createModel(_require(item), force);
      }
    }
  }
  logger.debug(i18n.t('重建数据表完成'));
};

const drop = async(modules) => {
  logger.debug(i18n.t('开始销毁数据表...'));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      await queryInterface.dropTable(name);
    }
  }
  logger.debug(i18n.t(`销毁数据表完成`));
}

const backup = async(modules) => {
  logger.debug(i18n.t(`开始备份数据表...`));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables().filter(name => modules.indexOf(name.split('_')[0]) > -1);
  if (tableNames.length <= 0) {
    logger.debug(i18n.t(`无数据表需要备份`));
  }
  for (let name of tableNames.filter(name => name.endsWith('__bak'))) {
    logger.debug(i18n.t(`删除历史备份`), name);
    await queryInterface.dropTable(name);
  }
  for (let name of tableNames.filter(name => !name.endsWith('__bak'))) {
    logger.debug(i18n.t(`备份数据表`), name);
    await queryInterface.renameTable(name, name + '__bak');
  }
  logger.debug(i18n.t(`备份数据表完成`));
}

const removeBackup = async(modules) => {
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (const name of tableNames) {
    if (!modules || (name.split('_')[0] in modules)) {
      if (name.endsWith('__bak')) {
        logger.debug(i18n.t(`删除历史备份`), name);
        await queryInterface.dropTable(name);
      }
    }
  }
}

const restore = async(modules, force = false) => {
  logger.debug(i18n.t(`开始恢复备份数据表..`));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      if (name.endsWith('__bak')) {
        const tblName = name.substr(0, name.length - 5);
        if (tableNames.indexOf(tblName) > -1) {
          if (force) {
            logger.debug(i18n.t(`删除已有数据表`), tblName);
            await queryInterface.dropTable(tblName);
          } else {
            throw new Error(i18n.t('数据表已经存在', tblName));
          }
        }
        logger.debug(i18n.t(`回复备份`), tblName);
        await queryInterface.renameTable(name, tblName);
      }
    }
  }
  logger.debug(i18n.t(`恢复备份数据表完成`));
}

const up = async(Migration) => {
  logger.debug(i18n.t(`升级`), getClassName(Migration));
  const migration = new Migration();
  await migration.up();
}

const down = async(Migration) => {
  logger.debug(i18n.t(`降级`), getClassName(Migration));
  const migration = new Migration();
  await migration.down();
}

// 升级或者降级
const migrate = async(modules, revert = false) => {
  if (revert) {
    logger.debug(i18n.t(`开始回退迁移数据..`));
  } else {
    logger.debug(i18n.t(`开始迁移数据..`));
  }
  const migrations = [];
  for (const item of Object.keys(_data.alias)) {
    const sp = item.split('/');
    const module = sp[0];
    const v = sp[2];
    if (modules.indexOf(module) < 0) {
      continue;
    }
    if (sp[1] != 'datamigration') {
      continue;
    }
    const last = lastChild(await Installs.find(module, 'install')) || {
      name: module,
      version: '0.0.0'
    };
    const current = lastChild(await Installs.find(module, 'waitCommit'));
    if (!current) {
      throw new Error(i18n.t('模块状态无效'), module);
    }
    if (cmpVer(v, last.version) > 0 && cmpVer(v, current.version) <= 0) {
      migrations.push(item);
    }
  }
  migrations.sort(cmpVer);
  const total = migrations.length;
  let current = 0;
  logger.debug(i18n.t('预计迁移数据'), total);
  if (revert) {
    migrations.reverse();
  }
  for (const typeAlias of migrations) {
    current++;
    if (revert) {
      await down(_require(typeAlias));
    } else {
      await up(_require(typeAlias));
    }
    logger.debug(i18n.t('已迁移数据') + ' ' + Math.floor(current * 100.0 / total) + '%');
  }
  logger.debug(i18n.t(`迁移数据完成`));
}

const connect = async(querydb) => {
  if (_data.db) {
    return _data.db;
  }
  const {
    database = 'saasplat_querys',
    username = 'root',
    password = '',
    ...options
  } = querydb;
  _data.db = new Sequelize(database, username, password, {
    ...options,
    logging: (...args) => {
      logger.debug(...args);
    }
  });
  // 检查是否能连接
  await _data.db.authenticate();
  return _data.db;
};
const TYPE = Sequelize; // 类型使用Sequelize

const clearData = () => {
  _data.export = {};
  _data.alias = {};
  _data.defines = {};
};

export default {
  alias,
  clearData,
  require : _require,
  data : _data,
  drop,
  get,
  define,
  create,
  backup,
  removeBackup,
  restore,
  migrate,
  connect,
  TYPE
};
