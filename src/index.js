import fs from 'fs';
import path from 'path';
import assert from 'assert';
import 'babel-polyfill';

import mvc from './mvc';
import * as cqrs from 'cqrs/lib/core';
import * as cqrsRegister from 'cqrs/lib/register';
import orm from './orm';
import config from './config';
import boots from './boots';

import './base';

import AutoReload from './util/auto_reload';
import WatchCompile from './util/watch_compile';

//const _modules = ['controller', 'logic', 'service', 'view', 'model', 'event', 'command', 'domain', 'config'];
const mvcTypes = ['controller', 'logic', 'service']; // model -> orm config -> config
const ormTypes = ['model'];
const cqrsTypes = ['command', 'domain', 'event', 'config'];
const bootTypes = ['bootstrap'];
const configTypes = ['config'];

export default class {
  constructor({
    appPath,
    devPath,
    modules,
    querydb,
    eventdb,
    debug,
    debugOutput
  }) {
    assert(appPath);
    assert(querydb);
    this.debugOutput = !!debugOutput;
    saasplat.appPath = this.appPath = appPath;
    this.devPath = devPath;
    saasplat.module = modules;
    saasplat.eventdb = eventdb;
    saasplat.querydb = querydb;
    saasplat.debugMode = this.debugMode = debug || false;
    if (saasplat.debugMode) {
      saasplat.log('saasplat debug mode');
    }
    // 连接查询库
    orm.db = orm.connect(querydb);
  }

  _getPath(module, type, prefix = '') {
    let mod = '';
    if (think.mode === think.mode_module) {
      mod = module + path.sep;
    }
    return `${this.appPath}${prefix}${path.sep}${mod}app${path.sep}${type}`;
  }

  _loadSubModule(name) {
    // todo dev path?
    let dir = path.join(this.appPath, name);
    let module = [];
    if (fs.statSync(dir).isDirectory()) {
      let dirs = fs.readdirSync(dir);
      if (dirs.length <= 0) return; // 空模块
      let isModule = false;
      for (let child of dirs) {
        //if (_modules.indexOf(child) >= 0) {
        if (child.toLowerCase() == 'package.json') {
          isModule = true;
          break;
        }
      }
      if (!isModule) {
        for (let child of dirs) {
          module = module.concat(this._loadSubModule(path.join(name, child)));
        }
      } else {
        //think.module.push(name); //加一起用thinkjs的原有的路由
        module.push(name);
      }
    }
    return module;
  }

  loadModule() {
    if (this.module) {
      return;
    }
    this.module = this._loadSubModule('');
    this.logDebug('load modules ' + this.module);
  }

  // 加载扩展的模板
  loadMVC() {
    for (let itemType of mvcTypes) {
      this.module.forEach(module => {
        let moduleType = module.replace(/\\/g, '/') + '/' + itemType;
        let filepath = this._getPath(module, think.dirname[itemType]);
        think.alias(moduleType, filepath, true);
      });
    }

    this.logDebug('load MVC type \n', think.alias());
  }

  loadORM() {
    for (let itemType of ormTypes) {
      this.module.forEach(module => {
        let moduleType = module.replace(/\\/g, '/') + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        orm.alias(moduleType, filepath);
      });
    }
    this.logDebug('load ORM type \n', orm.alias());
  }

  // 加载cqrs
  loadCQRS() {
    for (let itemType of cqrsTypes) {
      this.module.forEach(module => {
        let name = module.replace(/\\/g, '/');
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        cqrs.alias(moduleType, filepath);
      });
    }
    cqrsRegister.register();
    this.logDebug('load CQRS type \n', cqrs.alias());
  }

  loadTemplate() {
    let data = {};
    let add = filepath => {
      if (!think.isDir(filepath)) {
        return;
      }
      let files = think.getFiles(filepath, true);
      files.forEach(file => {
        let key = `${filepath}${path.sep}${file}`;
        data[key] = true;
      });
    };
    // this的view都在模块文件夹下定义
    this.module.forEach(module => {
      add(this._getPath(module, think.dirname.view));
    });
    this.templateThink = thinkData.template;
    thinkData.template = Object.assign(thinkData.template, data);

    this.logDebug('load View template \n', thinkData.template);
  }

  loadBootrstrap() {
    for (let itemType of bootTypes) {
      this.module.forEach(module => {
        let name = module.replace(/\\/g, '/');
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        boots.alias(moduleType, filepath);
      });
    }
    this.logDebug('load bootstrap type \n', boots.alias());
  }

  loadConfig() {
    for (let itemType of configTypes) {
      this.module.forEach(module => {
        let name = module.replace(/\\/g, '/');
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        config.alias(moduleType, filepath);
      });
    }
    this.logDebug('load config type \n', config.alias());
  }

  compile(options = {}) {
    this.loadModule();
    this.logDebug(`watch ${this.devPath}{path.sep}**{path.sep}src for compile...`);
    let reloadInstance = this.getReloadInstance();
    this.compileCallback = changedFiles => {
      reloadInstance.clearFilesCache(changedFiles);
      if (options.clearCacheHandler) {
        options.clearCacheHandler(changedFiles);
      }
    };
    let instance = new WatchCompile(this.devPath, this.module, options, this.compileCallback);
    instance.run();

    mvc.compile(options);
  }

  clearData() {
    // clear exports
    for (let module of this.module || []) {
      this.logDebug('clear ' + module);
      for (let type of bootTypes) {
        for (let alias in boots.data.alias) {
          if (boots.data.alias.hasOwnProperty(alias)) {
            if (alias.startsWith(module.replace(/\\/g, '/') + '/' + type)) {
              if (boots.data.export.hasOwnProperty(alias)) {
                delete boots.data.export[alias];
              }
              delete boots.data.alias[alias];
              this.logDebug('delete ' + alias);
            }
          }
        }
      }
      for (let type of configTypes) {
        for (let alias in config.data.alias) {
          if (config.data.alias.hasOwnProperty(alias)) {
            if (alias.startsWith(module.replace(/\\/g, '/') + '/' + type)) {
              if (config.data.export.hasOwnProperty(alias)) {
                delete config.data.export[alias];
              }
              delete config.data.alias[alias];
              this.logDebug('delete ' + alias);
            }
          }
        }
      }
      for (let type of ormTypes) {
        for (let alias in orm.data.alias) {
          if (orm.data.alias.hasOwnProperty(alias)) {
            if (alias.startsWith(module.replace(/\\/g, '/') + '/' + type)) {
              if (orm.data.export.hasOwnProperty(alias)) {
                delete orm.data.export[alias];
              }
              delete orm.data.alias[alias];
              this.logDebug('delete ' + alias);
            }
          }
        }
      }
      for (let type of cqrsTypes) {
        for (let alias in cqrs.fxData.alias) {
          if (cqrs.fxData.alias.hasOwnProperty(alias)) {
            if (alias.startsWith(module.replace(/\\/g, '/') + '/' + type)) {
              if (cqrs.fxData.export.hasOwnProperty(alias)) {
                delete cqrs.fxData.export[alias];
              }
              delete cqrs.fxData.alias[alias];
              this.logDebug('delete ' + alias);
            }
          }
        }
      }
      for (let type of mvcTypes) {
        for (let alias in thinkData.alias) {
          if (thinkData.alias.hasOwnProperty(alias)) {
            if (alias.startsWith(module.replace(/\\/g, '/') + '/' + type)) {
              if (thinkData.export.hasOwnProperty(alias)) {
                delete thinkData.export[alias];
              }
              delete thinkData.alias[alias];
              this.logDebug('delete ' + alias);
            }
          }
        }
      }
    }
    // todo
  }

  logDebug() {
    if (this.debugOutput) {
      saasplat.debug.apply(saasplat, arguments);
    }
  }

  load() {
    this.loadModule();
    this.loadORM();
    this.loadMVC();
    this.loadCQRS();
    this.loadConfig();
    this.loadTemplate();
    this.loadBootrstrap();
  }

  getReloadInstance() {
    let instance = new AutoReload(this.devPath, this.module, () => {
      this.clearData();
      this.load();
      boots.startup();
    });
    return instance;
  }

  autoReload() {
    //it auto reload by watch compile
    if (this.compileCallback) {
      return;
    }
    let instance = this.getReloadInstance();
    instance.run();
  }

  preload() {
    let startTime = Date.now();
    for (let name in thinkData.alias) {
      think.require(thinkData.alias[name]);
    }
    for (let name in orm.data.alias) {
      orm.require(orm.data.alias[name]);
    }
    for (let name in cqrs.fxData.alias) {
      cqrs._require(cqrs.fxData.alias[name]);
    }
    for (let name in config.data.alias) {
      config.require(config.data.alias[name]);
    }
    for (let name in boots.data.alias) {
      boots.require(boots.data.alias[name]);
    }
    saaplat.log('saasplat preload packages finished', 'PRELOAD', startTime);
  }

  // 创建数据库
  createModel() {
    orm.create();
  }

  captureError() {
    process.on('uncaughtException', function (err) {
      var msg = err.message || err;
      if (msg.toString().indexOf(' EADDRINUSE ') > -1) {
        saasplat.log(err);
        process.exit();
      } else {
        saasplat.error(err);
      }
    });
    process.on('unhandledRejection', function (err) {
      saasplat.error(err);
    });
  }

  run(preload) {
    this.load();
    this.autoReload();
    if (preload) {
      this.preload();
    }
    this.captureError();
    boots.startup();
    mvc.run();
  }
}
