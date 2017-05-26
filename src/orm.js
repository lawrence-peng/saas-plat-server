import path from 'path';
import fs from 'fs';
import Sequelize from 'sequelize'; // orm
import i18n from './util/i18n';
import logger from './util/log';
import Installs from './util/installs';
import {
  cmpVer,
  lastChild
} from './util/cmp';

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
  if (typeof obj === 'function') {
    obj.prototype.__filename = file;
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
  if (typeof obj == 'function') {
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
  return _data.db.define.apply(_data.db, [
    module + '_' + name,
    schame, {
      ...options,
      tableName: module + '_' + name
    }
  ]);
};

const get = (module, name) => {
  if (!name) {
    throw new Error(i18n.t('查询对象未找到'));
  }
  if (!module) {
    throw new Error(i18n.t('查询对象未找到，模块未知'));
  }
  const modelName = _data.alias[`${module}/model/${name}`];
  if (modelName in _data.defines) {
    return _data.defines[modelName];
  }
  try {
    const modelInst = new _require(modelName);
    _data.defines[modelName] = define(module, name, typeof modelInst.schame == 'function' ?
      modelInst.schame() : {}, typeof modelInst.schame == 'function' ?
      modelInst.options() : {});
    return _data.defines[modelName];
  } catch (e) {
    logger.warn(e);
    throw new Error(i18n.t('查询对象不存在'));
  }
}

const createModel = async(Model, force = false) => {
  const modelInst = new Model;
  const model = define(modelInst.__type.split('/')[0], modelInst.__type.split('/')[2], typeof modelInst.schame == 'function' ?
    modelInst.schame() : {}, typeof modelInst.options == 'function' ?
    modelInst.options() : {});
  if (model) {
    // force = drop and create
    await model.sync({
      force
    });
    // todo 执行升级脚本
    logger.info(model.name + i18n.t('表已创建或更新'));
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
  logger.info(i18n.t('开始重建数据表...'));
  for (let module of modules) {
    if (name) {
      await createModel(_require(`${module}/model/${name}`), force);
    } else {
      if (Object.keys(_data.alias).length<=0){
        logger.warn(i18n.t('未加载任何模型定义'));
      }
      for (var i in _data.alias) {
        if (i.indexOf(`${module}/model/`) > -1) {
          await createModel(_require(i), force);
        }
      }
    }
  }
  logger.info(i18n.t('重建数据表完成'));
};

const drop = async(modules) => {
  logger.info(i18n.t('开始销毁数据表...'));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      await queryInterface.dropTable(name);
    }
  }
  logger.info(i18n.t(`销毁数据表完成`));
}

const backup = async(modules) => {
  logger.info(i18n.t(`开始备份数据表...`));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      if (name.endsWith('__bak')) {
        await queryInterface.dropTable(name);
        continue;
      }
      await queryInterface.renameTable(name, name + '__bak');
    }
  }
  logger.info(i18n.t(`备份数据表完成`));
}

const removeBackup = async(modules) => {
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  tableNames.forEach(name => {
    if (!modules || (name.split('_')[0] in modules)) {
      if (name.endsWith('__bak')) {
        queryInterface.dropTable(name);
      }
    }
  });
}

const restore = async(modules, force = false) => {
  logger.info(i18n.t(`开始恢复备份数据表..`));
  const queryInterface = _data.db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      if (name.endsWith('__bak')) {
        const tblName = name.substr(0, name.length - 5);
        if (tableNames.indexOf(tblName) > -1) {
          if (force) {
            await queryInterface.dropTable(tblName);
          } else {
            throw new Error(i18n.t('数据表已经存在', tblName));
          }
        }
        await queryInterface.renameTable(name, tblName);
      }
    }
  }
  logger.info(i18n.t(`恢复备份数据表完成`));
}

const up = async(Migration, queryInterface) => {
  const migration = new Migration(queryInterface);
  await migration.up();
}

const down = async(Migration, queryInterface) => {
  const migration = new Migration(queryInterface);
  await migration.down();
}

// 升级或者降级
const migrate = async(modules, revert = false) => {
  const queryInterface = _data.db.getQueryInterface();
  const migrations = Object.keys(_data.alias).filter(item =>
    item.indexOf(`${module}/${_dirname.migration}/`)).sort(cmpVer);
  if (revert) {
    logger.info(i18n.t(`开始回退迁移数据..`));
    for (let module of modules) {
      const last = lastChild(await Installs.find(module, 'install'));
      const current = lastChild(await Installs.find(module, 'waitCommit'));
      if (!current || !last) {
        return;
      }
      const downs = migrations.filter(item => {
        const sp = item.split('/');
        if (sp[0] !== module) {
          return false;
        }
        const v = sp[2];
        return cmpVer(v, last.version) > 0 && cmpVer(v, current.version) < 0;
      });
      for (let i of downs) {
        await down(_require(i), queryInterface);
      }
    }
  } else {
    logger.info(i18n.t(`开始迁移数据..`));
    for (let module of modules) {
      const last = await Installs.find(module, 'install') || {
        name: module,
        version: '0.0.0'
      };
      const current = lastChild(await Installs.find(module, 'waitCommit'));
      if (!current) {
        return;
      }
      const ups = migrations.filter(item => {
        const sp = item.split('/');
        if (sp[0] !== module) {
          return false;
        }
        const v = sp[2];
        return cmpVer(v, last.version) > 0 && cmpVer(v, current.version) < 0;
      });
      for (var i of ups) {
        await up(_require(i), queryInterface);
      }
    }
  }
  logger.info(i18n.t(`迁移数据完成`));
}

const connect = async(querydb) => {
  if (_data.db) {
    return _data.db;
  }
  let {
    database = 'saasplat_querys',
      username = 'root',
      password = '',
      ...options
  } = querydb;
  _data.db = new Sequelize(database, username, password, options);
  // 检查是否能连接
  await _data.db.authenticate();
  return _data.db;
};
const TYPE = Sequelize; // 类型使用Sequelize

export default {
  alias,
  require: _require,
  data: _data,
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
