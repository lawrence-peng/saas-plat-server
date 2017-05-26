import fs from 'fs';
import path from 'path';
import assert from 'assert';
import glob from 'glob';

import mvc from './mvc';
import {
  app as mvcInstance
} from './mvc';
import cqrs from './cqrs';
import orm from './orm';
import config from './config';
import boots from './boots';
import logger from './log';
import i18n from './i18n';

import Installs from './util/installs';

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
    saasplat.appPath = this.appPath = path.normalize(appPath);
    saasplat.devPath = this.devPath = devPath && path.normalize(devPath);
    this.devModules = [];
    if (Array.isArray(modules)) {
      this.module = modules;
      this.glob = `+(${modules.join('|')})`
    } else if (typeof modules == 'string') {
      this.glob = modules;
    } else {
      logger.warn('module not found');
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

  _getPath(module, type) {
    let mod = '';
    if (think.mode === think.mode_module) {
      mod = module + path.sep;
    }
    let subPath;
    if (!this.moduleConfigs) {
      this.moduleConfigs = {};
    }
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
      : this.appPath}${path.sep}${mod}${subPath || 'app'}${path.sep}${type}`;
  }

  loadModule() {
    if (this.module) {
      this.logDebug('load modules ' + this.module);
      return;
    }
    let devModules = this.devPath ?
      glob.sync(this.devGlob, {
        cwd: this.devPath
      }) : [];
    let appModules = glob.sync(this.glob, {
      cwd: this.appPath
    }).filter(item => devModules.indexOf(item) < 0); // 重名已开发包为主
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

  loadORM(withMigration = false) {
    for (let itemType of ormTypes) {
      if (!withMigration && itemType == 'datamigration') {
        continue;
      }
      this.module.forEach(module => {
        let moduleType = module.replace(/\\/g, '/') + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        orm.alias(moduleType, filepath);
      });
    }
    this.logDebug('load ORM type \n', orm.alias());
  }

  // 加载cqrs
  loadCQRS(withMigration = false) {
    for (let itemType of cqrsTypes) {
      if (!withMigration && itemType == 'migration') {
        continue;
      }
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

  compile(options = {}) {
    assert(this.devPath || this.appPath);
    this.loadModule();
    //this.loadModule();
    this.logDebug(`watch ${this.devPath || this.appPath} for compile...`);
    let reloadInstance = this.getReloadInstance();
    this.compileCallback = changedFiles => {
      reloadInstance.clearFilesCache(changedFiles);
      if (options.clearCacheHandler) {
        options.clearCacheHandler(changedFiles);
      }
    };
    const devModules = glob.sync(this.devPath ? this.devGlob : this.glob, {
      cwd: this.devPath || this.appPath
    })
    let instance = new WatchCompile(this.devPath || this.appPath, devModules, options, this.compileCallback);
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

  logDebug(...args) {
    if (this.debugOutput) {
      logger.debug(...args);
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
    let instance = new AutoReload(this.devPath || this.appPath, this.module, () => {
      this.reload();
    });
    return instance;
  }

  autoReload() {
    if (!this.devPath || this.appPath) {
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

  reload() {
    this.clearData();
    this.load();
    boots.startup();
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
    logger.log(i18n.t('预加载程序包完成'), 'PRELOAD', startTime);
  }

  // 回退上次安装或升级失败
  async rollback() {
    await this.init();
    await this.init();
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    if (await Installs.has('waitCommit')) {
      logger.log(i18n.t('开始回滚安装失败模块'));
      await cqrs.backMigrate();
      if (await Installs.getInstallMode() == 'resouce') {
        logger.log(i18n.t('恢复数据库快速表备份'));
        await orm.restore(this.module);
      } else {
        //await cqrs.migrate(this.module, true);
        logger.log(i18n.t('回退数据库迁移'));
        await orm.migrate(this.module, true);
      }
      await Installs.rollback(this.module);
      logger.log(i18n.t('回滚失败模块完成'));
    } else {
      logger.log(i18n.t('无回滚任务'));
    }

    return true;
  }

  // 已有模块升级后需要数据迁移
  async migrate() {
    const notCommitteds = await Installs.has('waitCommit');
    if (notCommitteds) {
      throw new Error(i18n.t('还有上次未安装成功的模块需要回滚'));
    }

    await this.init();
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    try {
      // 记录
      await Installs.save(this.module.map(name => ({
        name,
        version: this.moduleConfigs[name].version,
        installDate: new Date(),
        status: 'waitCommit'
      })));
      await Installs.setInstallMode('migrate');
      // 升级数据
      await orm.migrate(this.module);
      // 升级业务
      await cqrs.revertVersion();
      await cqrs.migrate(this.module);
      // 提交
      await Installs.commit();
    } catch (err) {
      logger.error(i18n.t('数据迁移失败'), err);
      await cqrs.backMigrate();
      // 降级数据
      await orm.migrate(this.module, true);
      await Installs.rollback(this.module);
      return false;
    }
    return true;
  }

  // 采用回溯方式安装或升级(较慢)
  async resource() {

    const notCommitteds = await Installs.has('waitCommit');
    if (notCommitteds) {
      throw new Error(i18n.t('还有上次未安装成功的模块需要回滚'));
    }

    await this.init();
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    try {
      // 记录
      await Installs.save(this.module.map(name => ({
        name,
        version: this.moduleConfigs[name].version,
        installDate: new Date(),
        status: 'waitCommit'
      })));
      await Installs.setInstallMode('resource');
      // 之前可能已经安装过，但是卸载后会保留数据表，需要备份
      await orm.backup(this.module);
      // 重建
      await orm.create(this.module);
      // 重塑
      await cqrs.resource(this.module);
      // 升级业务
      await cqrs.revertVersion();
      await cqrs.migrate(this.module);
      // 提交
      await Installs.commit();
    } catch (err) {
      await cqrs.backMigrate();
      await orm.restore(this.module);
      await Installs.rollback(this.module);
      logger.error(i18n.t('业务回溯失败'), err);
      return false;
    }
    await orm.removeBackup();
    return true;
  }

  captureError() {
    process.on('uncaughtException', function (err) {
      var msg = err.message || err;
      if (msg.toString().indexOf(' EADDRINUSE ') > -1) {
        logger.warn(err);
        process.exit();
      } else {
        logger.error(err);
      }
    });
    process.on('unhandledRejection', function (err) {
      logger.error(err);
    });
  }

  async init() {
    // assert(this.querydb, '数据库必须配置');
    // assert(this.eventmq, '数据库必须配置');
    // assert(this.eventdb, '数据库必须配置');
    if (!this.querydb) {
      logger.warn('querydb未进行配置，启用默认配置');
    }
    if (!this.eventdb) {
      logger.warn('eventdb未进行配置，启用默认配置');
    }
    if (!this.eventmq) {
      logger.warn('eventmq未进行配置，启用默认配置');
    }
    if (this.debugMode) {
      logger.log('saasplat debug mode');
    }
    // 连接查询库
    await orm.connect(this.querydb);
    // 出事话cqrs
    cqrs.init({
      eventmq: this.eventmq,
      eventdb: this.eventdb
    })
    // 重置
    this.moduleConfigs = {};
  }

  async run(preload) {
    await this.init();
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
