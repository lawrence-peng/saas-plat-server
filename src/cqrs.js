import * as cqrs from 'cqrs-fx';
import * as cqrsCore from 'cqrs-fx/lib/core';
import * as cqrsEvent from 'cqrs-fx/lib/event';
import * as cqrsSnapshot from 'cqrs-fx/lib/snapshot';
import * as cqrsBus from 'cqrs-fx/lib/bus';
import MqWorker from 'cqrs-fx/lib/bus/mq_worker';
import config from 'cqrs-fx/lib/config';
import {getDecoratorToken} from 'cqrs-fx/lib/event/decorator';
import Installs from './util/installs';
import {cqrsLogger as logger} from './util/log';
import i18n from './util/i18n';
import {cmpVer, lastChild, getClassName} from './util/common';

const _dirname = {
  migration: 'migration'
};

let eventWorker;

const init = (cfg) => {
  config.init({
    bus: {
      commandBus: 'direct', // 命令采用同步执行
      eventBus: 'mq',
      eventMQ: {
        name: 'eventqueue',
        port: 6379,
        host: 'localhost',
        ...cfg.eventmq
      },
      ...cfg.bus
    },
    event: {
      storage: 'mongo_domain_event',
      collection: 'events'
    },
    repository: {
      type: 'event_sourced'
    },
    snapshot: {
      provider: 'event_number',
      storage: 'mongo', // redis mysql mongo memory ...
      collection: 'snapshots'
    },
    mongo: {
      url: 'mongodb://localhost:27017/cqrs',
      ...cfg.eventdb
    },
    log: {
      enable: cfg.debug,
      // logging: (...args) => {   logger.debug(...args); }, warning: (...args) => {
      // logger.warn(...args); }, error: (...args) => {   logger.error(...args); }
    }
  });
}

const run = async() => {
  if (eventWorker) {
    return;
  }
  eventWorker = new MqWorker('event');
  await eventWorker.run();
}

const clear = async() => {
  await cqrsSnapshot.getStorage().drop();
  await cqrsEvent.getStorage().eventStorage.drop();
}

// A <- B <- C <- D 重溯B时需要连带C的事件，所以这里需要计算modules的所有依赖模块
const caluModules = (modules) => {
  const calus = [...modules];
  Object.keys(cqrsCore.fxData.alias).filter(item => item.indexOf(`/event/`) > -1 && modules.indexOf(item.split('/')[0]) > -1).map(alias => cqrsCore._require(alias)).forEach((type) => {
    let ctoken = getDecoratorToken(type);
    if (!ctoken.name && !ctoken.module) {
      if (!type.prototype) {
        return;
      }
      ctoken = {
        module: type.prototype.__module,
        name: type.name
      };
    }
    for (const p of Object.getOwnPropertyNames(type.prototype)) {
      if (p === 'constructor') {
        continue;
      }
      if (typeof type.prototype[p] !== 'function') {
        continue;
      }
      let {
        module = ctoken.module,
        name = p
      } = getDecoratorToken(type.prototype[p]);
      if (module && name) {
        if (calus.indexOf(module) == -1) {
          calus.push(module);
        }
      }
    }
  });
  return calus;
}

const invoke = (callback, ...args) => {
  if (!callback) {
    return;
  }
  if (typeof callback == 'function') {
    try {
      callback(...args);
    } catch (err) {
      logger.warn(i18n.t('回调失败'), err);
    }
  }
}

const createListener = (total, progressCallback) => {
  let current
  return ({
    module,
    name,
    type,
    id
  }, code, error) => {
    if (!code) {
      current++;
      logger.debug(i18n.t('开始回溯事件'), module + '/' + name, id);
    } else if (code == 'ok') {
      logger.debug(i18n.t('回溯事件完成'), module + '/' + name, id);
    } else if (code != 'nohandler') {
      logger.error(i18n.t('回溯事件失败'), module + '/' + name, id, code, error || '');
    }
    invoke(progressCallback, {
      module,
      name,
      type,
      id,
      total,
      current
    });
  }
}

// 回溯业务事件，可以指定业务日期
const resource = async(modules, gteTimestamp, progressCallback) => {
  saasplat.resourcing = true;
  let total = 0,
    current = 0;
  logger.debug(i18n.t('开始回溯事件...'));
  try {
    const eventModules = caluModules(modules);
    const eventDispatcher = {
      __proto__: cqrsBus.getEventDispatcher(),
      getHandlers: (name, module) => {
        // 过滤出需要回溯的模块handler
        return (cqrsBus.getEventDispatcher().getHandlers(name, module) || []).filter(handler => {
          return modules.indexOf(handler.CLS.prototype.__module) > -1;
        });
      }
    };
    const eventStorage = cqrsEvent.getStorage().eventStorage;
    total = await eventStorage.count({
      module: {
        $in: eventModules
      }
    });
    const listener = createListener(total, progressCallback);
    eventDispatcher.addListener(listener, listener, listener);
    logger.debug(i18n.t('预计回溯事件') + ' ' + total);
    const spec = {
      module: {
        $in: eventModules
      }
    };
    if (gteTimestamp) {
      sepc['timestamp'] = {
        $gte: gteTimestamp
      }
    }
    // 按时间顺序回溯
    const cursor = await eventStorage.visit(spec, {
      timestamp: 1
    }, async(item) => {
      current++;
      if (!await eventDispatcher.dispatch({
        type: 'event',
        id: item.id,
        data: item.data,
        name: item.name,
        module: item.module,
        sourceId: item.source_id,
        sourceAlias: item.source_type,
        branch: item.branch,
        version: item.version,
        timestamp: item.timestamp
      })) {
        throw new Error(i18n.t('回溯事件部分失败'));
      }
      logger.debug(i18n.t('已回溯事件') + ' ' + Math.floor(current * 100.0 / total) + '%');
    });
  } finally {
    delete saasplat.resourcing;
    logger.debug(i18n.t('回溯事件完成'));
  }
}

const up = async(Migration) => {
  logger.debug(i18n.t(`升级`), getClassName(Migration));
  const migration = new Migration();
  await migration.up();
}

// const down = async(Migration) => {   const migration = new Migration(); await
// migration.down(); }

const revertVersion = async() => {
  const eventStorage = cqrsEvent.getStorage().eventStorage;
  const lastEvent = await eventStorage.first({}, {timestamp: 1});
  await Installs.setRevertVersion(lastEvent
    ? lastEvent.timestamp
    : new Date());
}

const migrate = async(modules, progressCallback) => {
  assert(modules);
  logger.debug(i18n.t('开始迁移...'));
  const migrations = {};
  let total = 0;
  let current = 0;
  for (module of modules) {
    const last = lastChild(await Installs.find(module, 'install')) || {
      name: module,
      version: '0.0.0',
      status: 'install'
    };
    const current = lastChild(await Installs.find(module, 'waitCommit'));
    if (current) {
      migrations[module] = Object.keys(cqrsCore.fxData.alias).filter(item => item.indexOf(`${module}/${_dirname.migration}/`) > -1).filter(item => {
        const sp = item.split('/');
        // 大于已安装版本， 并且小于等于当前程序版本
        return cmpVer(sp[2], last.version) > 0 && cmpVer(sp[2], current.version) <= 0;
      }).sort((a, b) => {
        const v1 = a.split('/')[2];
        const v2 = b.split('/')[2];
        return cmpVer(v1, v2);
      });
      total += migrations[module].length;
    } else {
      throw new Error(module + i18n.t('模块状态无效'));
    }
  }
  logger.debug(i18n.t('预计迁移命令') + ' ' + total);
  invoke(progressCallback, {total, current});
  for (const module of modules) {
    const ups = migrations[module];
    for (var i of ups) {
      current++;
      await up(cqrsCore._require(i));
      invoke(progressCallback, {total, current});
      logger.debug(i18n.t('已执行迁移') + ' ' + Math.floor(current * 100.0 / total) + '%');
    }
  }
  logger.debug(i18n.t('迁移完成'));
}

const backMigrate = async() => {
  const revertVersion = await Installs.getRevertVersion();
  if (!revertVersion) {
    return false;
  }
  const eventStorage = cqrsEvent.getStorage().eventStorage;
  await eventStorage.delete({
    version: {
      $gt: revertVersion
    }
  }, {force: true});
  await Installs.setRevertVersion(null);
  return true;
}

const clearData = () => {
  cqrsCore.fxData.export = {};
  cqrsCore.fxData.alias = {}
  cqrsCore.fxData.container = {};
};

export default {
  init,
  run,
  clearData,
  clear,
  fxData : cqrsCore.fxData,
  alias : cqrsCore.alias,
  resource,
  migrate,
  revertVersion,
  backMigrate,
  ...cqrs
};
