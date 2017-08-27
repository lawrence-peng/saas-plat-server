import Sequelize from 'sequelize';
import alias from './util/alias';
import i18n from './util/i18n';
import {ormLogger as logger} from './util/log';
import state from './util/state';
import {cmpVer, lastChild, getClassName} from './util/common';

const _data = {
  defines: {},
  db: null,
  sysdb: null
};

const define = (module, name, schame, options, type = 'model') => {
  if (!module) {
    const mn = name.split('/');
    if (mn.length === 2) {
      module = mn[0];
      name = mn[1];
    }
  }
  if (!module) {
    throw new Error(404, type === 'system'
      ? i18n.t('系统对象')
      : i18n.t('查询对象'), i18n.t('无效，模块未指定'));
  }
  const db = type === 'model'
    ? _data.db
    : _data.sysdb;
  // 系统库增加前缀system_module_xxx
  const px = type === 'model'
    ? ''
    : 'system_';
  const Model = db.define(px + module + '_' + name, schame, {
    ...options,
    tableName: px + module + '_' + name
  });
  return Model;
};

const get = (module, name, type = 'model') => {
  if (!name) {
    throw new Error(404, type === 'system'
      ? i18n.t('系统对象')
      : i18n.t('查询对象'), i18n.t('未找到'));
  }
  if (!module) {
    throw new Error(404, type === 'system'
      ? i18n.t('系统对象')
      : i18n.t('查询对象'), i18n.t('未找到，模块未知'));
  }
  const modelAlias = `${module}/${type}/${name}`;
  if (modelAlias in _data.defines) {
    return _data.defines[modelAlias];
  }
  try {
    if (!(modelAlias in alias.alias())) {
      logger.debug(type === 'system'
        ? i18n.t('系统对象')
        : i18n.t('查询对象'), i18n.t('不存在'), `${module}/${name}`);
      return null;
    }
    const ModelType = alias.require(alias.alias()[modelAlias]);
    if (!ModelType) {
      logger.warn(type === 'system'
        ? i18n.t('系统对象')
        : i18n.t('查询对象'), i18n.t('加载失败'), `${module}/${name}`);
      return null;
    }
    const modelInst = new ModelType();
    if (typeof modelInst.schame !== 'object' && typeof modelInst.schame !== 'function') {
      logger.warn(type === 'system'
        ? i18n.t('系统对象')
        : i18n.t('查询对象'), i18n.t('schame未定义'), `${module}/${name}`);
    }
    _data.defines[modelAlias] = define(module, name, typeof modelInst.schame === 'function'
      ? modelInst.schame()
      : (modelInst.schame || {}), typeof modelInst.options === 'function'
      ? modelInst.options()
      : (modelInst.options || {}), type);
    return _data.defines[modelAlias];
  } catch (e) {
    logger.warn(e);
    throw new Error(404, type === 'system'
      ? i18n.t('系统对象')
      : i18n.t('查询对象'), i18n.t('不存在'));
  }
}

const createModel = async(Model, force = false) => {
  if (Model) {
    // force = drop and create
    await Model.sync({force});
    // todo 执行升级脚本
    logger.debug(i18n.t('表已创建'), Model.name);
  } else {
    logger.debug(i18n.t('表无效'), Model.name);
  }
};

const create = async(modules, name, force = false, type = 'model') => {
  const dbtype = type === 'sysmigration'
    ? i18n.t('系统库')
    : i18n.t('查询库');
  logger.debug(dbtype, i18n.t('开始重建数据表...'));
  if (!Array.isArray(modules)) {
    modules = [modules];
  }
  for (let module of modules) {
    if (name) {
      await createModel(get(module, name, type), force);
    } else {
      const models = Object.keys(alias.alias()).filter(item => item.indexOf(`${module}/${type}/`) > -1);
      if (models.length <= 0) {
        logger.warn(i18n.t('未加载任何模型定义'));
      }
      for (const item of models) {
        await createModel(get(module, item.split('/')[2], type), force);
      }
    }
  }
  logger.debug(dbtype, i18n.t('重建数据表完成'));
};

const drop = async(modules, type = 'model') => {
  const dbtype = type === 'sysmigration'
    ? i18n.t('系统库')
    : i18n.t('查询库');
  logger.debug(dbtype, i18n.t('开始销毁数据表...'));
  const db = type === 'model'
    ? _data.db
    : _data.sysdb;
  const queryInterface = db.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  for (let name of tableNames) {
    if (!modules || modules.indexOf(name.split('_')[0]) > -1) {
      await queryInterface.dropTable(name);
    }
  }
  logger.debug(dbtype, i18n.t(`销毁数据表完成`));
}

const backup = async(modules, type = 'model') => {
  const dbtype = type === 'sysmigration'
    ? i18n.t('系统库')
    : i18n.t('查询库');
  logger.debug(dbtype, i18n.t(`开始备份数据表...`));
  const db = type === 'model'
    ? _data.db
    : _data.sysdb;
  const queryInterface = db.getQueryInterface();
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
  logger.debug(dbtype, i18n.t(`备份数据表完成`));
}

const removeBackup = async(modules, type = 'model') => {
  const db = type === 'model'
    ? _data.db
    : _data.sysdb;
  const queryInterface = db.getQueryInterface();
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

const restore = async(modules, force = false, type = 'model') => {
  const dbtype = type === 'sysmigration'
    ? i18n.t('系统库')
    : i18n.t('查询库');
  logger.debug(dbtype, i18n.t(`开始恢复备份数据表..`));
  const db = type === 'model'
    ? _data.db
    : _data.sysdb;
  const queryInterface = db.getQueryInterface();
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
  logger.debug(dbtype, i18n.t(`恢复备份数据表完成`));
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
const migrate = async(modules, revert = false, type = 'datamigration') => {
  const dbtype = type === 'sysmigration'
    ? i18n.t('系统库')
    : i18n.t('查询库');
  if (revert) {
    logger.debug(dbtype, i18n.t(`开始回退迁移数据..`));
  } else {
    logger.debug(dbtype, i18n.t(`开始迁移数据..`));
  }
  const migrations = [];
  for (const item of Object.keys(alias.alias())) {
    const sp = item.split('/');
    const module = sp[0];
    const v = sp[2];
    if (modules.indexOf(module) < 0) {
      continue;
    }
    if (sp[1] !== type) {
      continue;
    }
    const last = lastChild(await state.find(module, 'install')) || {
      name: module,
      version: '0.0.0'
    };
    const current = lastChild(await state.find(module, 'waitCommit'));
    if (!current) {
      throw new Error(500, dbtype, i18n.t('模块状态无效'), module);
    }
    if (cmpVer(v, last.version) > 0 && cmpVer(v, current.version) <= 0) {
      migrations.push(item);
    } else {
      logger.debug(item, last.version, '<', v, '<=', current.version, 'skip...')
    }
  }
  migrations.sort(cmpVer);
  const total = migrations.length;
  let current = 0;
  logger.debug(dbtype, i18n.t('预计迁移数据'), total);
  if (revert) {
    migrations.reverse();
  }
  for (const typeAlias of migrations) {
    current++;
    if (revert) {
      await down(alias.require(typeAlias));
    } else {
      await up(alias.require(typeAlias));
    }
    logger.debug(dbtype, i18n.t('已迁移数据') + ' ' + Math.floor(current * 100.0 / total) + '%');
  }
  logger.debug(dbtype, i18n.t(`迁移数据完成`));
}

const connect = async(querydb, sysdb) => {
  if (querydb && !_data.db) {
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
  }

  if (sysdb && !_data.sysdb) {
    const {
      database = 'saasplat_system',
      username = 'root',
      password = '',
      ...options
    } = sysdb;
    _data.sysdb = new Sequelize(database, username, password, {
      ...options,
      logging: (...args) => {
        logger.debug(...args);
      }
    });
    // 检查是否能连接
    await _data.sysdb.authenticate();
  }
};

const TYPE = Sequelize; // 类型使用Sequelize

export default {
  drop,
  get,
  define,
  data : _data,
  create,
  backup,
  removeBackup,
  restore,
  migrate,
  connect,
  TYPE
};
