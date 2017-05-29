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
import {init as logInit, spLogger as logger} from './util/log';
import i18n from './util/i18n';
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
    log,
    logLevel
  }) {
    assert(appPath, '应用程序启动路径不能为空');
    saasplat.appPath = this.appPath = path.normalize(appPath);
    saasplat.devPath = this.devPath = devPath && path.normalize(devPath);
    this.devModules = [];
    if (Array.isArray(modules)) {
      this.module = modules;
      this.glob = `+(${modules.join('|')})`
    } else if (typeof modules == 'string') {
      this.glob = modules;
    } else {
      logger.warn(i18n.t('模块不存在'));
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
    logInit(log);
    logger.setLevel(logLevel || 'INFO');
    if (this.module) {
      logger.debug(i18n.t('模块加载完成'), this.module.length);
      logger.trace(this.module);
    }
  }

  _getPath(module, type) {
    let mod = '';
    if (think.mode === think.mode_module) {
      mod = module + path.sep;
    }
    let subPath = 'app';
    if (!this.moduleConfigs) {
      this.moduleConfigs = {};
    }
    let config = this.moduleConfigs[module];
    if (!this.moduleConfigs[module]) {
      let searchPath = this.appPath;
      if (this.devModules.indexOf(module) > -1) {
        searchPath = this.devPath;
      }
      // package可以配置main文件夹，默认app
      let packagefile = path.join(searchPath, module, 'package.json');
      if (fs.existsSync(packagefile)) {
        try {
          config = JSON.parse(fs.readFileSync(packagefile));
        } catch (err) {
          logger.warn(i18n.t('配置文件加载失败'), packagefile);
        }
      }
      if (!config) {
        config = {};
      }
      this.moduleConfigs[module] = config;
    }
    if ((typeof config.main == 'string') && !config.main.endsWith('.js')) {
      subPath = config.main;
    }
    return `${this.devModules.indexOf(module) > -1
      ? this.devPath
      : this.appPath}${path.sep}${mod}${subPath}${path.sep}${type}`;
  }

  loadModule() {
    if (this.module) {
      return;
    }
    let devModules = this.devPath
      ? glob.sync(this.devGlob, {cwd: this.devPath})
      : [];
    let appModules = glob.sync(this.glob, {cwd: this.appPath}).filter(item => devModules.indexOf(item) < 0); // 重名已开发包为主
    this.devModules = devModules;
    this.module = appModules.concat(devModules);
    logger.debug(i18n.t('模块加载完成'), this.module.length);
    logger.trace(this.module);
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

    logger.trace('load MVC module \n', think.module);
    logger.trace('load MVC type \n', think.alias());
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
    logger.trace('load ORM type \n', orm.alias());
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
    logger.trace('load CQRS type \n', cqrs.alias());
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

    logger.trace('load View template \n', thinkData.template);
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
    logger.trace('load bootstrap type \n', boots.alias());
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
    logger.trace('load config type \n', config.alias());
  }

  compile(options = {}) {
    assert(this.devPath || this.appPath);
    this.loadModule();
    logger.trace(`watch ${this.devPath || this.appPath} for compile...`);
    let reloadInstance = this.getReloadInstance();
    this.compileCallback = changedFiles => {
      reloadInstance.clearFilesCache(changedFiles);
      if (options.clearCacheHandler) {
        options.clearCacheHandler(changedFiles);
      }
    };
    const devModules = glob.sync(this.devPath
      ? this.devGlob
      : this.glob, {
      cwd: this.devPath || this.appPath
    })
    let instance = new WatchCompile(this.devPath || this.appPath, devModules, options, this.compileCallback);
    instance.run();
    mvcInstance.compile(options);
  }

  clearData() {

    logger.warn(i18n.t('重新加载...'));

    boots.data.export = {};
    boots.data.alias = {};

    config.data.export = {};
    config.data.alias = {};

    orm.data.export = {};
    orm.data.alias = {};
    orm.data.defines = {};

    cqrs.fxData.export = {};
    cqrs.fxData.alias = {}
    cqrs.fxData.container = {};

    thinkData.alias = {};
    thinkData.export = {};
    thinkData.config = {};
    thinkData.hook = {};
    thinkData.template = {};
    thinkData.middleware = {};
    thinkData.subController = {};
    thinkData.route = null;

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
    logger.debug(i18n.t('预加载程序包完成'), 'PRELOAD', startTime);
  }

  // WARN!! 清空事件库将删除全部业务数据
  async clearEvents() {
    logger.warn(i18n.t('清空业务数据!'));
    await cqrs.clear();
  }

  // 回退上次安装或升级失败
  async rollback(force = false) {

    logger.info(i18n.t('开始回滚安装失败模块'));
    await this.init({
      cqrs: {
        bus: {
          commandBus: 'direct',
          eventBus: 'direct'
        }
      }
    });
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    if (await Installs.has('waitCommit')) {
      await cqrs.backMigrate();
      if (await Installs.getInstallMode() == 'resouce') {
        logger.debug(i18n.t('恢复数据库快速表备份'));
        await orm.restore(this.module, force);
      } else {
        //await cqrs.migrate(this.module, true);
        logger.debug(i18n.t('回退数据库迁移'));
        await orm.migrate(this.module, true);
      }
      await Installs.rollback(this.module);
      logger.debug(i18n.t('回滚失败模块完成'));
    } else {
      logger.debug(i18n.t('无回滚任务'));
    }

    return true;
  }

  // 已有模块升级后需要数据迁移
  async migrate() {
    logger.info(i18n.t('开始迁移模块'));
    const notCommitteds = await Installs.has('waitCommit');
    if (notCommitteds) {
      throw new Error(i18n.t('还有上次未安装成功的模块需要回滚'));
    }

    await this.init({
      cqrs: {
        bus: {
          commandBus: 'direct',
          eventBus: 'direct'
        }
      }
    });
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    if (!this.module || this.module.length <= 0) {
      logger.warn(i18n.t('未加载任何模块'));
    }

    try {
      // 记录
      await Installs.save(this.module.map(name => ({name, version: this.moduleConfigs[name].version, installDate: new Date(), status: 'waitCommit'})));
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

    logger.info(i18n.t('开始回溯模块'));
    const notCommitteds = await Installs.has('waitCommit');
    if (notCommitteds) {
      throw new Error(i18n.t('还有上次未安装成功的模块需要回滚'));
    }

    await this.init({
      cqrs: {
        bus: {
          commandBus: 'direct',
          eventBus: 'direct'
        }
      }
    });
    this.loadModule();
    this.loadORM(true);
    this.loadCQRS(true);
    this.loadConfig();

    if (!this.module || this.module.length <= 0) {
      logger.warn(i18n.t('未加载任何模块'));
    }

    try {
      // 记录
      await Installs.save(this.module.map(name => ({name, version: this.moduleConfigs[name].version, installDate: new Date(), status: 'waitCommit'})));
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
      logger.error(i18n.t('业务回溯失败'), err);
      await cqrs.backMigrate();
      await orm.restore(this.module);
      await Installs.rollback(this.module);
      return false;
    }
    await orm.removeBackup();
    return true;
  }

  captureError() {
    process.on('uncaughtException', function(err) {
      var msg = err.message || err;
      if (msg.toString().indexOf(' EADDRINUSE ') > -1) {
        logger.warn(err);
        process.exit();
      } else {
        logger.error(err);
      }
    });
    process.on('unhandledRejection', function(err) {
      logger.error(err);
    });
  }

  async init(cfg = {}) {
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
      logger.warn('eventmq未进行配置，启用默认配置', 'aaa');
    }
    if (this.debugMode) {
      logger.debug('debug mode');
    }
    this.clearData();
    // 连接查询库
    await orm.connect(this.querydb);
    // 出事话cqrs
    cqrs.init({
      debug: this.debugMode,
      eventmq: this.eventmq,
      eventdb: this.eventdb,
      ...cfg.cqrs
    })
    // 重置
    this.moduleConfigs = {};
  }

  async run(preload) {
    logger.info(i18n.t('启动 saasplat-server...'));
    await this.init();
    this.load();
    this.autoReload();
    if (preload) {
      mvcInstance.preload();
      this.preload();
    }
    this.captureError();
    await boots.startup();
    await mvc.require('app').run();
    await cqrs.run();
  }
}
