/*
saasplat server interface
*/
import path from 'path';
import mvc from './mvc';
import cqrs from 'cqrs-fx';
import orm from './orm';
import logger from './log';
import conf from './config';
import co from 'co';

global.saasplat = {};
saasplat.sep = path.sep;
saasplat.join = path.join;
saasplat.dirname = path.dirname;
saasplat.co = co;

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

// 界面通过元数据配置方式定义
saasplat.view = {};
saasplat.view.base = class {
  constructor() {
    this.name = '';
    this.component = null;
    this.metadata = {};
  }
};

let _publish = (module, ...messages) => {
  if (messages.length <= 0) return;
  if (typeof messages[0] === 'string') {
    if (messages[0] === '')
      return;
    // @表示全名 不包含两个—_
    if (!messages[0].endWith(module) && !messages[0].startWith('@') &&
      messages[0].indexOf('_') == messages[0].lastIndexOf('_')) {
      // 简化调用方式
      messages[0] += '_' + module;
    }
  }
  cqrs.bus.publishCommand(messages);
};

// 控制器使用thinkjs的
saasplat.controller = {};
saasplat.controller.base = class extends mvc.controller.base {
  publish(...messages) {
    _publish(saasplat.module, messages);
  }

  query(name, module) {
    module = (module || saasplat.module) + '/model/';
    return saasplat.model.get(module + name);
  }

  config(name, value) {
    return saasplat.config(name, value, saasplat.module);
  }
};

saasplat.controller.rest = class extends mvc.controller.rest {
  publish(...messages) {
    _publish(saasplat.module, messages);
  }

  query(name, module) {
    module = (module || saasplat.module) + '/model/';
    return saasplat.model.get(module + name);
  }

  config(name, value) {
    return saasplat.config(name, value, saasplat.module);
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
saasplat.repository = class  {
  static get(name, id, module, ...other) {
    module = (module || saasplat.module) + '/domain/';
    return cqrs.repository.get(module + name, id, ...other);
  }
};

saasplat.aggregate = class extends cqrs.aggregate {
  static get(name, id, module, ...other) {
    module = (module || saasplat.module) + '/domain/';
    return cqrs.aggregate.get(module + name, id, ...other);
  }
};

// 使用Sequelize orm
saasplat.model = {};
global.TYPE = saasplat.model.TYPE = orm.TYPE;
saasplat.model.get = (name, module) => {
  module = (module || saasplat.module) + '/domain/';
  if (saasplat.debugMode) {
    logger.debug('get model ' + module + name);
  }
  return orm.require(module + name);
};
saasplat.model.define = (...args) => {
  return orm.db.define.apply(orm.db, args);
};
