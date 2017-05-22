import * as cqrs from 'cqrs-fx';
import * as cqrsCore from 'cqrs-fx/lib/core';
import * as cqrsEvent from 'cqrs-fx/lib/event';
import * as cqrsBus from 'cqrs-fx/lib/bus';
import config from 'cqrs-fx/lib/config';
import {getDecoratorToken} from 'cqrs-fx/lib/event/decorator';
import Installs from './util/installs';
import logger from './log';
import i18n from './i18n';

import {getModuleVersion} from './util/modulever';

const _dirname = {
  migration: 'migration'
};

const init = (cfg) => {
  config.init({
    bus: {
      commandBus: 'direct',
      eventBus: 'mq',
      eventMQ: {
        name: 'eventqueue',
        port: 6379,
        host: '127.0.0.1',
        ...cfg.eventmq
      }
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
    }
  });
}

// A <- B <- C <- D
// 重溯B时需要连带C的事件，所以这里需要计算modules的所有依赖模块
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

const createListener = (total, progressCallback) => {
  let current,
    success,
    failed
  return ({
    module,
    name,
    type,
    id
  }, code, error) => {
    if (!code) {
      current++;
      logger.info(i18n.t('开始重塑事件'), module + '/' + name, id);
    } else if (code == 'ok') {
      success++;
      logger.info(i18n.t('重塑事件完成'), module + '/' + name, id);
    } else {
      failed++;
      logger.info(i18n.t('重塑事件失败'), module + '/' + name, id, code, error);
    }
    if (typeof progressCallback == 'function') {
      progressCallback({
        module,
        name,
        type,
        id,
        total,
        current,
        success,
        failed
      });
    }
  }
}

// 回溯业务事件，可以指定业务日期
const resource = async(modules, gteTimestamp, progressCallback) => {
  saasplat.resourcing = true;
  let total = 0,
    current = 0;
  logger.info(i18n.t('开始重塑事件...'));
  try {
    const eventModules = caluModules(modules);
    const eventDispatcher = cqrsBus.getEventDispatcher();
    const eventStorage = cqrsEvent.getStorage().eventStorage;
    total = await eventStorage.count({
      module: {
        $in: eventModules
      }
    });
    const listener = createListener(total, progressCallback);
    eventDispatcher.addListener(listener, listener, listener);
    logger.info(i18n.t('预计重塑事件') + ' ' + total);
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
    const cursor = await eventStorage.visit(spec, async(item) => {
      current++;
      await eventDispatcher.dispatch({
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
      });
      logger.info(i18n.t('已重塑事件') + ' ' + Math.floor(current * 100.0 / total) + '%');
    });
  } finally {
    delete saasplat.resourcing;
    logger.info(i18n.t('重塑事件完成'));
  }
}

const up = async(Migration) => {
  const migration = new Migration();
  await migration.up();
}

const down = async(Migration) => {
  const migration = new Migration();
  await migration.down();
}

const revertVersion = async() => {
  const eventStorage = cqrsEvent.getStorage().eventStorage;
  const lastEvent = await eventStorage.first({}, {timestamp: 1});
  if (lastEvent) {
    return lastEvent.timestamp;
  }
  return new Date();
}

const migrate = async(modules, revert) => {
  const migrations = cqrsCore.fxData.alias.filter(item => item.indexOf(`${module}/${_dirname.migration}/`)).sort((a, b) => {
    const v1 = a.split('/')[2].split('.');
    const v2 = b.split('/')[2].split('.');
    for (let i = 0; i < v1.length || i < v2.length; i++) {
      if (v1[i] < v2[i]) {
        return -1;
      } else if (v1[i] > v2[i]) {
        return 1;
      }
    }
    return 0;
  });
  if (revert) {
    const mv = getModuleVersion(modules);
    modules.forEach(async(module) => {
      const install = await Installs.find(module);
      if (!install) {
        return;
      }
      const v2 = install.version.split('.');
      const cv = mv[module].split('.');
      const downs = migrations.filter(item => {
        const sp = item.split('/');
        if (sp[0] !== module) {
          return false;
        }
        const v = sp[2].split('.');
        for (let i = 0; i < v.length; i++) {
          if (v[i] < v2[i] && v[1] < cv[i]) {
            return true;
          }
        }
        return false;
      });
      for (var i in downs) {
        await down(_require(i));
      }
      install.version = downs[downs.length - 1].split('/')[2];
      await Installs.save(install);
    });
  } else {
    const mv = getModuleVersion(modules);
    modules.forEach(async(module) => {
      const install = await Installs.find(module) || {
        name: module,
        version: '0.0.0',
        status: 'install'
      };
      const v2 = install.version.split('.');
      const cv = mv[module].split('.');
      const ups = migrations.filter(item => {
        const sp = item.split('/');
        if (sp[0] !== module) {
          return false;
        }
        const v = sp[2].split('.');
        for (let i = 0; i < v.length; i++) {
          // 大于已安装版本， 并且小于当前程序版本
          if (v[i] > v2[i] && v[i] < cv[i]) {
            return true;
          }
        }
        return false;
      });
      for (var i in ups) {
        await up(_require(i));
      }
      install.version = ups[downs.length - 1].split('/')[2];
      await Installs.save(install);
    });
  }
}

const backMigrate = async(revertVersion) => {
  if (!revertVersion) {
    return false;
  }
  const eventStorage = cqrsEvent.getStorage().eventStorage;
  await eventStorage.delete({
    version: {
      $gt: revertVersion
    }
  }, {force: true});
  return true;
}

export default {
  init,
  fxData : cqrsCore.fxData,
  alias : cqrsCore.alias,
  resource,
  migrate,
  revertVersion,
  backMigrate,
  ...cqrs
}
