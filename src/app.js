import fs from 'fs';
import path from 'path';
import assert from 'assert';
import glob from 'glob';

import mvc from './mvc';
import cqrs from './cqrs';
import orm from './orm';
import config from './config';
import boots from './boots';
import task from './task';
import dataSrv from './data';
import user from './user';
import privilege from './privilege';
import workflow from './workflow';

import alias from './util/alias';
import { init as logInit, spLogger as logger } from './util/log';
import i18n from './util/i18n';
import state from './util/state';
import AutoReload from './util/auto_reload';
import WatchCompile from './util/watch_compile';

// const _modules = ['controller', 'logic', 'service', 'view', 'model', 'event',
// 'command', 'domain', 'config'];
const mvcTypes = ['controller', 'logic', 'service']; // model -> orm config -> config
const ormTypes = ['model', 'datamigration', 'system', 'sysmigration'];
const cqrsTypes = ['command', 'domain', 'event', 'config', 'migration'];
const bootTypes = ['bootstrap'];
const configTypes = ['config'];
const taskTypes = ['task'];

export default class {
  constructor({
    appPath,
    devPath,
    modules,
    devModules,
    datadb, // 数据存储服务mongodb
    querydb, // 查询存储 mysql
    eventdb, // 事件存储 mongodb
    systemdb, // 系统功能 mysql
    eventmq,
    eventBus,
    eventStoreage,
    snapshotStoreage,
    debug,
    log,
    logLevel,
    codePath = 'app',
    // mvc
    host,
    port,
    route_on,
    // 没有license将不启动平台功能
    license
  }) {
    assert(appPath, '应用程序启动路径不能为空');
    this.codePath = codePath;
    this.appPath = path.normalize(appPath);
    this.devPath = devPath && path.normalize(devPath);
    this.devModules = [];
    if (Array.isArray(modules)) {
      this.glob = `+(${modules.join('|')})`;
    } else if (typeof modules === 'string') {
      this.glob = modules;
    } else {
      logger.warn(i18n.t('模块不存在'));
    }
    if (Array.isArray(devModules)) {
      this.devGlob = `+(${modules.join('|')})`;
    } else if (typeof devModules === 'string') {
      this.devGlob = devModules;
    } else {
      this.devGlob = '*';
    }
    this.debugMode = debug || false;
    this.datadb = datadb;
    this.querydb = querydb;
    this.eventdb = eventdb;
    this.systemdb = systemdb;
    this.eventmq = eventmq;
    this.eventBus = eventBus;
    this.eventStoreage = eventStoreage;
    this.snapshotStoreage = snapshotStoreage;
    this.license = license;
    logInit(log);
    logger.setLevel(logLevel || 'INFO');
    mvc.init({ appPath, debug, host, port, route_on });
    require('./base'); // 需要等thinkjs加载完controller
    saasplat.appPath = this.appPath;
    saasplat.devPath = this.devPath;
    saasplat.debugMode = this.debugMode;
    saasplat.systemdb = this.systemdb;
  }

  _getPath(module, type) {
    let mod = module + path.sep;
    let subPath = this.codePath;
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
    if ((typeof config.main === 'string') && !config.main.endsWith('.js')) {
      subPath = config.main;
    }
    return `${this.devModules.indexOf(module) > -1
      ? this.devPath
      : this.appPath}${path.sep}${mod}${subPath}${path.sep}${type}`;
  }

  loadModule() {
    if (this.modules) {
      // saasplat.modules = this.modules; saasplat.devModules = this.devModules;
      return;
    }
    let devModules = this.devPath ?
      glob.sync(this.devGlob, { cwd: this.devPath }) : [];
    let appModules = glob.sync(this.glob, { cwd: this.appPath }).filter(item =>
      devModules.indexOf(item) < 0); // 重名已开发包为主
    this.devModules = devModules;
    this.modules = appModules.concat(devModules);
    saasplat.modules = this.modules;
    saasplat.devModules = this.devModules;
    logger.debug(i18n.t('模块加载完成'), this.modules.length);
    logger.trace(this.modules);
  }

  // 加载扩展的模板
  loadMVC() {
    think.module = think.module.concat(this.modules);

    for (let itemType of mvcTypes) {
      this.modules.forEach(module => {
        let moduleType = module + '/' + itemType;
        let filepath = this._getPath(module, think.dirname[itemType]);
        think.alias(moduleType, filepath, true);
      });
    }

    logger.trace('load MVC module \n', think.module);
    logger.trace('load MVC type \n', think.alias());
  }

  loadORM(withMigration = false) {
    for (let itemType of ormTypes) {
      if (!withMigration && itemType === 'datamigration') {
        continue;
      }
      this.modules.forEach(module => {
        let moduleType = module + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        alias.alias(moduleType, filepath);
      });
    }
    logger.trace('load ORM type \n', alias.filter(ormTypes));
  }

  // 加载cqrs
  loadCQRS(withMigration = false) {
    for (let itemType of cqrsTypes) {
      if (!withMigration && itemType === 'migration') {
        continue;
      }
      this.modules.forEach(module => {
        let name = module;
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
    this.modules.forEach(module => {
      add(this._getPath(module, think.dirname.view));
    });
    this.templateThink = thinkData.template;
    thinkData.template = Object.assign(thinkData.template, data);

    logger.trace('load View template \n', thinkData.template);
  }

  loadBootrstrap() {
    for (let itemType of bootTypes) {
      this.modules.forEach(module => {
        let name = module;
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        alias.alias(moduleType, filepath);
      });
    }
    logger.trace('load bootstrap type \n', alias.filter(bootTypes));
  }

  loadConfig() {
    for (let itemType of configTypes) {
      this.modules.forEach(module => {
        let name = module;
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        alias.alias(moduleType, filepath);
      });
    }
    logger.trace('load config type \n', alias.filter(configTypes));
  }

  loadTask() {
    for (let itemType of taskTypes) {
      this.modules.forEach(module => {
        let name = module;
        let moduleType = name + '/' + itemType;
        let filepath = this._getPath(module, itemType);
        alias.alias(moduleType, filepath);
      });
    }
    logger.trace('load task type \n', alias.filter(taskTypes));
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
    const opt = {
      cwd: this.devPath || this.appPath
    };
    const devModules = glob.sync(this.devPath ?
      this.devGlob :
      this.glob, opt);
    let instance = new WatchCompile(this.devPath || this.appPath, devModules,
      options, this.compileCallback);
    instance.run();
    // mvc.compile( options );
  }

  clearData() {
    // 这里需要清除model的define
    orm.clearData();
    alias.clearData();
    cqrs.clearData();
    mvc.clearData();
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
    let instance = new AutoReload(this.devPath || this.appPath, this.modules,
      () => {
        this.reload();
      });
    return instance;
  }

  autoReload() {
    if (!this.devPath || this.appPath) {
      // 没有需要动态加载的目录
      return;
    }
    // it auto reload by watch compile
    if (this.compileCallback) {
      return;
    }
    let instance = this.getReloadInstance();
    instance.run();
  }

  reload() {
    logger.warn(i18n.t('重新加载...'));
    this.clearData();
    this.load();
    boots.startup();
  }

  preload() {
    let startTime = Date.now();
    mvc.preload();
    cqrs.preload();
    alias.preload();
    logger.debug(i18n.t('预加载程序包完成'), 'PRELOAD', startTime);
  }

  // WARN!! 清空事件库将删除全部业务数据
  async clearEvents() {
    logger.warn(i18n.t('清空业务数据!'));
    await cqrs.clear();
  }

  // 回退上次安装或升级失败
  async rollback(modules, force = false) {
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

    if (await state.has('waitCommit')) {
      await cqrs.backMigrate();
      if (await state.getInstallMode() === 'resouce') {
        logger.debug(i18n.t('恢复数据库快速表备份'));
        await orm.restore(modules || this.modules, force);
      } else {
        // await cqrs.migrate(this.modules, true);
        logger.debug(i18n.t('回退数据库迁移'));
        await orm.migrate(modules || this.modules, true);
      }
      await state.rollback(modules || this.modules);
      logger.debug(i18n.t('回滚失败模块完成'));
    } else {
      logger.debug(i18n.t('无回滚任务'));
    }

    return true;
  }

  // 已有模块升级后需要数据迁移
  async migrate(modules) {
    logger.info(i18n.t('开始迁移模块'));
    const notCommitteds = await state.has('waitCommit');
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

    modules = modules || modules;

    if (!modules || modules.length <= 0) {
      logger.warn(i18n.t('未加载任何模块'));
    }

    try {
      // 记录
      await state.save(modules.map(name => ({
        name,
        version: this.moduleConfigs[name].version,
        installDate: new Date(),
        status: 'waitCommit'
      })));
      await state.setInstallMode('migrate');
      // 升级系统库
      await orm.migrate(modules, false, 'sysmigration');
      // 升级数据
      await orm.migrate(modules);
      // 升级业务
      await cqrs.revertVersion();
      await cqrs.migrate(modules);
      // 提交
      await state.commit();
    } catch (err) {
      logger.error(i18n.t('数据迁移失败'), err);
      await cqrs.backMigrate();
      // 降级数据
      await orm.migrate(modules, true);
      await orm.migrate(modules, true, 'sysmigration');
      await state.rollback(modules);
      return false;
    }
    return true;
  }

  // 采用回溯方式安装或升级(较慢)
  async resource(modules) {

    logger.info(i18n.t('开始回溯模块'));
    const notCommitteds = await state.has('waitCommit');
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

    modules = modules || modules;

    if (!modules || modules.length <= 0) {
      logger.warn(i18n.t('未加载任何模块'));
    }

    try {
      // 记录
      await state.save(modules.map(name => ({
        name,
        version: this.moduleConfigs[name].version,
        installDate: new Date(),
        status: 'waitCommit'
      })));
      await state.setInstallMode('resource');
      // 之前可能已经安装过，但是卸载后会保留数据表，需要备份
      await orm.backup(modules);
      // 重建
      await orm.create(modules);
      // 重塑
      await cqrs.resource(modules);
      // 升级业务
      await cqrs.revertVersion();
      await cqrs.migrate(modules);
      // 提交
      await state.commit();
    } catch (err) {
      logger.error(i18n.t('业务回溯失败'), err);
      await cqrs.backMigrate();
      await orm.restore(modules);
      await state.rollback(modules);
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
    // assert(this.querydb, '数据库必须配置'); assert(this.eventmq, '数据库必须配置');
    // assert(this.eventdb, '数据库必须配置');
    if (!this.datadb) {
      logger.warn('datadb未进行配置，已启用默认配置');
    }
    if (!this.querydb) {
      logger.warn('querydb未进行配置，已启用默认配置');
    }
    if (!this.eventStoreage && !this.eventdb) {
      logger.warn('eventdb未进行配置，已启用默认配置');
    }
    if (!this.eventBus && !this.eventmq) {
      logger.warn('eventmq未进行配置，已启用默认配置');
    }
    if (this.debugMode) {
      logger.debug('debug mode');
    }
    //
    await dataSrv.init(this.datadb);
    // 连接数据库
    await orm.connect(this.querydb, this.systemdb);
    await orm.create(this.modules, null, false, 'system');
    await orm.create(this.modules);
    // 初始化 cqrs
    cqrs.init({
      debug: this.debugMode,
      eventmq: this.eventmq,
      eventdb: this.eventdb,
      eventBus: this.eventBus,
      eventStoreage: this.eventStoreage,
      snapshotStoreage: this.snapshotStoreage,
      ...cfg.cqrs
    });
    await user.init();
    await privilege.init();
    await workflow.init();
    // task
    await task.init({
      ...cfg.task
    });
    // 重置
    this.moduleConfigs = {};
  }

  async run(preload) {
    logger.info(i18n.t('启动 saas-plat-server...'));
    await this.init();
    this.load();
    this.autoReload();
    if (preload) {
      this.preload();
    }
    this.captureError();
    // todo： 如下服务启用哪些以后需要根据分开部署的角色决定
    await boots.startup();
    await mvc.run();
    await cqrs.run();
    await task.run();
  }

  async test() {
    logger.info(i18n.t('测试 saas-plat-server...'));
    await this.init();
    this.load();
    this.preload();
    // 测试只需要启用如下服务
    await boots.startup();
    await cqrs.run();
    await task.run();
  }
}
