import 'babel-polyfill';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import glob from 'glob';

import mvc from './mvc';
import {app as mvcInstance} from './mvc';
import cqrs from './cqrs';
import orm from './orm';
import config from './config';
import boots from './boots';

import i18n from './i18n';

import AutoReload from './util/auto_reload';
import WatchCompile from './util/watch_compile';

import './base';

//const _modules = ['controller', 'logic', 'service', 'view', 'model', 'event', 'command', 'domain', 'config'];
const mvcTypes = ['controller', 'logic', 'service']; // model -> orm config -> config
const ormTypes = ['model', 'datamigration'];
const cqrsTypes = ['command', 'domain', 'event', 'config', 'migration'];
const bootTypes = ['bootstrap'];
const configTypes = ['config'];

export default class {
  constructor({
    appPath,
    srcPath,
    devPath,
    modules,
    devModules,
    querydb,
    eventdb,
    systemdb,
    eventmq,
    debug,
    debugOutput
  }) {
    assert(appPath, '应用程序启动路径不能为空');

    this.debugOutput = !!debugOutput;
    saasplat.appPath = this.appPath = appPath;
    this.srcPath = srcPath;
    this.devPath = devPath;
    if (Array.isArray(modules)) {
      this.module = modules;
    } else if (typeof modules == 'string') {
      this.glob = modules;
    } else {
      saasplat.log('module not found');
    }
    if (Array.isArray(devModules)) {
      this.module = (this.module || []).concat(devModules);
    } else if (typeof modules == 'string') {
      this.devGlob = devModules;
    }
    saasplat.debugMode = this.debugMode = debug || false;
    this.devGlob = devModules || '*';
    this.querydb = querydb;
    this.eventdb = eventdb;
    saasplat.systemdb = this.systemdb = systemdb;
    this.eventmq = eventmq;
  }

  _getPath(module, type, prefix = '') {
    let mod = '';
    if (think.mode === think.mode_module) {
      mod = module + path.sep;
    }
    let subPath;
    if (this.moduleConfigs[module]) {
      subPath = this.moduleConfigs[module].main;
    } else {
      let searchPath = this.appPath;
      if (this.devModules.indexOf(module) > -1) {
        searchPath = this.devPath;
      }
      let config;
      // package可以配置main文件夹，默认app
      let packagefile = path.join(searchPath, module, 'package.json');
      if (fs.existsSync(packagefile)) {
        config = JSON.parse(fs.readFileSync(packagefile));
      }
      if (!config) {
        config = {};
      }
      this.moduleConfigs[module] = config;
      subPath = config.main;
    }
    return `${this.devModules.indexOf(module) > -1
      ? this.devPath
      : this.appPath}${prefix}${path.sep}${mod}${subPath || 'app'}${path.sep}${type}`;
  }

  loadModule() {
    if (this.module) {
      this.logDebug('load modules ' + this.module);
      return;
    }
    let devModules = this.devPath
      ? glob.sync(this.devGlob, {cwd: this.devPath})
      : [];
    let appModules = glob.sync(this.glob, {cwd: this.appPath}).filter(item => devModules.indexOf(item) < 0); // 重名已开发包为主
    this.devModules = devModules;
    this.module = appModules.concat(devModules);
    this.logDebug('load modules ' + this.module);
  }

  // 加载扩展的模板
  loadMVC() {
    think.module = think.module.concat(this.module);

    for (let itemType of mvcTypes) {
      this.module.forEach(module => {
        let moduleType = module.replace(/\\/g, '/') + '/' + itemType;
        let filepath = this._getPath(module, think.dirname[itemType]);
        think.alias(moduleType, filepath, true);
      });
    }

    this.logDebug('load MVC module \n', think.module);
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

  compile(options) {
    assert(this.srcPath);
    //this.loadModule();
    this.logDebug(`watch ${this.srcPath} for compile...`);
    let reloadInstance = this.getReloadInstance();
    this.compileCallback = changedFiles => {
      reloadInstance.clearFilesCache(changedFiles);
      if (options.clearCacheHandler) {
        options.clearCacheHandler(changedFiles);
      }
    };
    const devModules = glob.sync(this.devGlob, {cwd: this.srcPath})
    let instance = new WatchCompile(this.srcPath, devModules, options, this.compileCallback);
    instance.run();

    mvcInstance.compile(options);
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
    this.moduleConfigs = {};
    this.loadModule();
    this.loadORM();
    this.loadMVC();
    this.loadCQRS();
    this.loadConfig();
    this.loadTemplate();
    this.loadBootrstrap();
  }

  getReloadInstance() {
    let instance = new AutoReload(this.srcPath, this.module, () => {
      this.clearData();
      this.load();
      boots.startup();
    });
    return instance;
  }

  autoReload() {
    if (!this.srcPath) {
      // 没有需要动态加载的目录
      return;
    }
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

  // 重塑数据库
  async migrate() {
    // 连接查询库
    orm.connect(this.querydb);
    await orm.db.authenticate();
    // 备份
    await orm.backup(this.module);
    try {
      // 重建
      await orm.create(this.module);
      // 重塑
      await cqrs.resource(this.module);
      // 升级
      await cqrs.migrate(this.module);
    } catch (err) {
      saasplat.error(i18n.t('数据迁移失败'), err);
      await cqrs.backMigrate();
      await orm.restore(this.module, true);
      return false;
    }
    await orm.removeBackup(this.module);
    return true;
  }

  captureError() {
    process.on('uncaughtException', function(err) {
      var msg = err.message || err;
      if (msg.toString().indexOf(' EADDRINUSE ') > -1) {
        saasplat.log(err);
        process.exit();
      } else {
        saasplat.error(err);
      }
    });
    process.on('unhandledRejection', function(err) {
      saasplat.error(err);
    });
  }

  init() {
    assert(this.querydb, '数据库必须配置');
    if (saasplat.debugMode) {
      saasplat.log('saasplat debug mode');
    }
    // 连接查询库
    orm.connect(this.querydb);
    //orm.db.authenticate();
    // 出事话cqrs
    cqrs.init({eventmq: this.eventmq, eventdb: this.eventdb})
  }

  run(preload) {
    this.init();
    this.load();
    this.autoReload();
    if (preload) {
      mvcInstance.preload();
      this.preload();
    }
    this.captureError();
    boots.startup();
    mvc.require('app').run();
  }
}
