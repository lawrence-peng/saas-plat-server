import * as cqrs from 'cqrs-fx';
import * as cqrsCore from 'cqrs-fx/lib/core';
import * as cqrsEvent from 'cqrs-fx/lib/event';
import config from 'cqrs-fx/lib/config';
import Installs from './util/installs';
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

const resource = async(modules) => {
  saasplat.resourcing = true;
  try {} finally {
    delete saasplat.resourcing;
  }
}

let revertVersion = -1;

const up = async(Migration) => {
  const migration = new Migration();
  await migration.up();
}

const down = async(Migration) => {
  const migration = new Migration();
  await migration.down();
}

const migrate = async(modules, revert) => {
  const store = cqrsEvent.getStorage('mongo');
  const db = await store.connect();
  try {
    const version = await db.collection(store.collection).findOne({order: 'version DESC'});
    if (version) {
      revertVersion = version.version;
    } else {
      revertVersion = 0;
    }
  } finally {
    db.close();
  }
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

const backMigrate = async() => {
  if (revertVersion < 0) {
    return false;
  }
  const store = cqrsEvent.getStorage('mongo');
  const db = await store.connect();
  try {
    (await db.collection(store.collection).findAll({
      version: {
        $gt: revertVersion
      }
    })).destroy({force: true});
  } finally {
    db.close();
  }
  revertVersion = -1;
  return true;
}

export default {
  init,
  fxData : cqrsCore.fxData,
  alias : cqrsCore.alias,
  resource,
  migrate,
  backMigrate,
  ...cqrs
}
