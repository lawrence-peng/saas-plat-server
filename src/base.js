/*
saasplat server interface
*/
import path from 'path';
import mvc from './mvc';
import cqrs from './cqrs';
import orm from './orm';
import logger from './log';
import conf from './config';
import assert from 'assert';
import i18n from './i18n';

global.assert = assert;

global.saasplat = {};
saasplat.sep = path.sep;
saasplat.join = path.join;
saasplat.dirname = path.dirname;

saasplat.getModuleConfig = function (module, name) {
  let config = conf.require(module + '/config/config', true);
  if (!name) return config;
  if (config && config[name]) return config[name];
  config = conf.require(module + '/config/' + name, true);
  return config;
};
saasplat.setModuleConfig = function (module, name, value) {
  console.warn('setModuleConfig not support!');
};
saasplat.config = function (name, value, module) {
  if (value == undefined) {
    if (module) {
      let val = saasplat.getModuleConfig(module, name);
      if (val) return val;
      return mvc.config(name);
    } else {
      return mvc.config(name);
    }
  } else {
    if (module) {
      saasplat.setModuleConfig(name, value, module)
    } else {
      mvc.config(name, value);
    }
  }
};

saasplat.logEnable = true;

saasplat.log = (...args) => {
  if (saasplat.logEnable)
    logger.info.apply(logger, args);
};
saasplat.warn = (...args) => {
  if (saasplat.logEnable)
    logger.warn.apply(logger, args);
};
saasplat.debug = (...args) => {
  if (saasplat.logEnable)
    logger.debug.apply(logger, args);
};
saasplat.info = (...args) => {
  if (saasplat.logEnable)
    logger.info.apply(logger, args);
};
saasplat.error = (...args) => {
  if (saasplat.logEnable)
    logger.error.apply(logger, args);
};

// // 界面通过元数据配置方式定义
// saasplat.view = {};
// saasplat.view.base = class {
//   constructor() {
//     this.name = '';
//     this.component = null;
//     this.metadata = {};
//   }
// };

saasplat.command = {};
saasplat.command.publish = cqrs.bus.publishCommand;

// 控制器使用thinkjs的
saasplat.controller = {};
saasplat.controller.base = class extends mvc.controller.base {
  publish(...messages) {
    cqrs.bus.publishCommand(messages);
  }

  query(name, module) {
    module = (module || saasplat.module) + '/model/';
    return saasplat.model.get(module + name);
  }

  config(name, value) {
    return saasplat.config(name, value, saasplat.module);
  }
};

saasplat.controller.rest = class extends saasplat.controller.base {
  init(http) {
    super.init(http);

    this._isRest = true;
    this._method = '';
  }
};

saasplat.logic = {};
saasplat.logic.base = class extends mvc.logic.base {
  query(name, module) {
    module = (module || saasplat.module) + '/model/';
    return saasplat.model.get(module + name);
  }

  config(name, value) {
    return saasplat.config(name, value, saasplat.module);
  }
};

// 领域层使用cqrs
saasplat.repository = class {
  static get(name, id, module, ...other) {
    module = (module || saasplat.module) + '/domain/';
    return cqrs.repository.get(module + name, id, ...other);
  }
};

saasplat.aggregate = class extends cqrs.Aggregate {
  static get(name, id, module, ...other) {
    module = (module || saasplat.module) + '/domain/';
    return cqrs.Aggregate.get(module + name, id, ...other);
  }
};

saasplat.commandhandler = class extends cqrs.CommandHandler {

};

saasplat.eventhandler = class extends cqrs.EventHandler {
  get(name, module) {
    module = (module || saasplat.module);
    return saasplat.model.get(name, module);
  }
};

// 使用Sequelize orm
saasplat.model = {};
saasplat.model.base = class {
  schame() {
    return null;
  }
  options() {
    return null;
  }
}

saasplat.migration = class{
  constructor(queryInterface){
    this.queryInterface = queryInterface;
  }
}


global.TYPE = saasplat.model.TYPE = orm.TYPE;
saasplat.model.get = (name, module) => {
  if (!name) {
    throw new Error(i18n.t('查询对象未找到'));
  }
  if (!module) {
    const mn = name.split('/');
    if (mn.length == 2) {
      module = mn[0];
      name = mn[1];
    }
  }
  if (!module) {
    throw new Error(i18n.t('查询对象未找到，模块未知'));
  }
  try {
    const modelName = module + '/model/' + name;
    if (modelName in orm.data.defines) {
      return orm.data.defines[modelName];
    }
    const modelInst = new orm.require(modelName);
    orm.data.defines[modelName] = saasplat.model.define(module, name,
      typeof modelInst.schame == 'function' ? modelInst.schame() : {},
      typeof modelInst.schame == 'function' ? modelInst.options() : {});
    return orm.data.defines[modelName];
  } catch (e) {
    saasplat.warn(e);
    throw new Error(i18n.t('查询对象不存在'));
  }
};
saasplat.model.define = (module, name, schame, options) => {
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
  return orm.db.define.apply(orm.db, [module + '_' + name, schame, {
    ...options,
    tableName: module + '_' + name
  }]);
};
