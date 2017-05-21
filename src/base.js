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

saasplat.getModuleConfig = function(module, name) {
  let config = conf.require(module + '/config/config', true);
  if (!name)
    return config;
  if (config && config[name])
    return config[name];
  config = conf.require(module + '/config/' + name, true);
  return config;
};
saasplat.setModuleConfig = function(module, name, value) {
  console.warn('setModuleConfig not support!');
};
saasplat.config = function(name, value, module) {
  if (value == undefined) {
    if (module) {
      let val = saasplat.getModuleConfig(module, name);
      if (val)
        return val;
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

const getModule = (filename) => {
  if (filename.startsWith(saasplat.appPath)) {
    return filename.substr(saasplat.appPath.length + 1).split(path.sep)[0]
  }
  if (filename.startsWith(saasplat.devPath)) {
    return filename.substr(saasplat.devPath.length + 1).split(path.sep)[0]
  }
  if (!saasplat.appPath && !saasplat.devPath) {
    saasplat.log(i18n.t('服务器未成功启动'));
  }
  return null;
}

const checkModule = (moduleName) => {
  if (typeof moduleName !== 'string') {
    throw new Error(i18n.t('模块不存在'));
  }
  return moduleName;
}

// 控制器使用thinkjs的
saasplat.controller = {};
saasplat.controller.base = class extends mvc.controller.base {
  get module() {
    return getModule(this.__filename);
  }

  publish(...messages) {
    cqrs.bus.publishCommand(messages);
  }

  query(name, module) {
    module = (checkModule(module || this.module));
    return saasplat.model.get(module + name);
  }

  config(name, value, module) {
    return saasplat.config(name, value, checkModule(module || this.module));
  }
};

saasplat.controller.rest = class extends saasplat.controller.base {
  init(http) {
    super.init(http);

    this._isRest = true;
    this._method = '';
  }

  get module() {
    return getModule(this.__filename);
  }
};

saasplat.logic = {};
saasplat.logic.base = class extends mvc.logic.base {
  get module() {
    return getModule(this.__filename);
  }

  query(name, module) {
    module = (checkModule(module || this.module));
    return saasplat.model.get(module + name);
  }

  config(name, value) {
    return saasplat.config(name, value, this.module);
  }
};

// 领域层使用cqrs

saasplat.command = {};
saasplat.command.publish = cqrs.bus.publishCommand;

saasplat.repository = cqrs.repository;
saasplat.aggregate = class extends cqrs.Aggregate {};

global.event = cqrs.event;
global.command = cqrs.command;

saasplat.commandhandler = class extends cqrs.CommandHandler {
  get module() {
    return getModule(this.__filename);
  }

  model(name, module) {
    return saasplat.model.get(name, checkModule(module || this.module));
  }
 
  getRepository(name, module) {
    return {
      get: async({
        id,
        ...options
      }) => {
        await this.repository.getRepository(name, id, checkModule(module || this.module), options)
      }
    };
  }
};

saasplat.eventhandler = class extends cqrs.EventHandler {
  get module() {
    return getModule(this.__filename);
  }

  model(name, module) {
    return saasplat.model.get(name, checkModule(module || this.module));
  }
};

saasplat.migration = class Migration {
  get module() {
    return getModule(this.__filename);
  }

  get repository() {
    return cqrs.getRepository();
  }

  model(name, module) {
    return saasplat.model.get(name, checkModule(module || this.module));
  }

  getAggregate(name, module) {
    return cqrs.Aggregate.get(name, checkModule(module || this.module));
  }
}

// 使用Sequelize orm
saasplat.model = {};
saasplat.model.base = class {
  get module() {
    return getModule(this.__filename);
  }
  schame() {
    return null;
  }
  options() {
    return null;
  }
}

saasplat.model.migration = class {
  constructor(queryInterface) {
    this.queryInterface = queryInterface;
  }
  up() {}
  down() {}
}

global.TYPE = saasplat.model.TYPE = orm.TYPE;
saasplat.model.get = (name, module) => {
  if (!name) {
    throw new Error(i18n.t('查询对象未找到'));
  }
  if (!module) {
    const mn = name.split(path.sep);
    if (mn.length == 2) {
      module = mn[0];
      name = mn[1];
    }
  }
  if (!module) {
    throw new Error(i18n.t('查询对象未找到，模块未知'));
  }
  return orm.get(module, name);
};
