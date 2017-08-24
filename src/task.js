import path from 'path';
import fs from 'fs';
import schedule from 'node-schedule';
import moment from 'moment';
import i18n from './util/i18n';
import cqrs from './cqrs';
import { taskLogger as logger } from './util/log';

const MAX_READTASKS = 100;

const tasks = [];
const jobs = new Map();
const _alias = {};
const _export = {};
let timer;

const getFiles = (file) => {
  let dirs = [];
  if (fs.existsSync(file)) {
    let files = fs.readdirSync(file);
    for (var fi of files) {
      if (fs.statSync(path.join(file, fi)).isFile()) {
        dirs.push(fi);
      }
    }
  }
  return dirs;
};

// 定义别名
const alias = (type, paths) => {
  if (!type) {
    return _alias;
  }
  //regist alias
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  paths.forEach(dir => {
    let files = getFiles(dir);
    files.forEach(file => {
      if (file.slice(-3) !== '.js' || file[0] === '_') {
        return;
      }
      let name = file.slice(0, -3).replace(/\\/g, '/'); //replace \\ to / on windows
      name = type + '/' + name;
      _alias[name] = `${dir}${path.sep}${file}`;
    });
  });
};

let _interopSafeRequire = file => {
  let obj = require(file);
  if (obj && obj.__esModule && obj.default) {
    return obj.default;
  }
  return obj;
};

let _safeRequire = file => {
  // absolute file path is not exist
  if (path.isAbsolute(file)) {
    //no need optimize, only invoked before service start
    if (!fs.statSync(file).isFile()) {
      return null;
    }
    //when file is exist, require direct
    return _interopSafeRequire(file);
  }
  try {
    return _interopSafeRequire(file);
  } catch (err) {
    logger.error(err);
  }
  return null;
};

let _loadRequire = (name, filepath) => {
  let obj = _safeRequire(filepath);
  if (typeof obj === 'function') {
    obj.prototype.__type = name;
    obj.prototype.__filename = filepath;
  }
  if (obj) {
    _export[name] = obj;
  }
  return obj;
};

// 通过别名加载类型
const _require = (name, flag) => {
  if (typeof name !== 'string') {
    return name;
  }
  // adapter or middle by register
  let Cls = _export[name];
  if (!Cls) {
    let filepath = _alias[name];
    if (filepath) {
      return _loadRequire(name, path.normalize(filepath));
    }
    // only check in alias
    if (flag) {
      return null;
    }
    filepath = require.resolve(name);
    Cls = _loadRequire(name, filepath);
    if (!Cls) {
      return null;
    }
  }
  return Cls;
};

const cancelJob = (task) => {
  if (jobs.has(task.id)) {
    const j = jobs.get(task.id);
    j.cancel();
    jobs.delete(task.id);
    logger.debug(i18n.t('计划已取消'), task.module, task.name);
  }
}

const runJob = (task) => {
  logger.debug(i18n.t('计划开始执行'), task.module, task.name);
  // 需要先更新一下，有可能已经取消
  if (task.status !== 'enabled') {
    cancelJob(task);
    logger.debug(i18n.t('计划取消执行'), task.module, task.name);
    return;
  }
  if (task.type !== 'cron') {
    jobs.delete(task.id);
  }
  try {
    // 计划任务到期就执行一个命令
    cqrs.bus.publishCommand({
      module: task.module,
      name: task.command,
      data: task.data
    });
  } catch (err) {
    logger.debug(i18n.t('计划执行失败'), err);
    task.status = 'error';
    task.reason = err.message;
    task.save();
  }
}

const createJob = (task) => {
  if (jobs.has(task.id)) {
    const ej = jobs.get(task.id);
    ej.reschedule(task.type === 'cron' ?
      task.cron :
      task.date);
    logger.debug(i18n.t('计划重置'), task.module, task.name);
    return true;
  }
  const j = schedule.scheduleJob(task.module + '_' + task.name, task.type ===
    'cron' ?
    task.cron :
    moment(task.date).toDate(), runJob.bind(null, task));
  if (!j) {
    task.status = 'error';
    task.reason = '任务调度计划无效';
    //throw new Error(500, i18n.t('任务创建失败，任务调度计划无效'));
    logger.debug(i18n.t('计划创建失败'), task.module, task.name);
    return false;
  } else {
    jobs.set(task.id, j);
    logger.debug(i18n.t('计划创建成功'), task.module, task.name);
    return true;
  }
}

const refresh = () => {
  try {
    logger.debug(i18n.t('任务开始刷新'));
    const result = tasks.filter(it => it.status === 'enabled');
    if (result.length > MAX_READTASKS) {
      logger.warn(i18n.t('任务过多'), MAX_READTASKS);
    }
    // 删除不存在的任务
    jobs.forEach((ej, k) => {
      if (!result.find(r => r.id === k)) {
        ej.cancel();
        jobs.delete(k);
      }
    });
    // 更新或新建已有任务
    for (let i = 0; i < result.length; i++) {
      const it = result[i];
      createJob(it);
    }
  } catch (err) {
    logger.warn(i18n.t('任务加载失败'), err);
  }
}

const init = () => {
  // 加载任务定义
  for (const p in _alias) {
    const Task = _require(_alias[p]);
    const task = new Task();
    add(task.name, task.module, task.spec, task.command, task.data, task.description);
  }
}

const run = () => {
  timer = schedule.scheduleJob('10 * * * *', function() {
    logger.debug(i18n.t('任务同步开始...'));
    refresh().then(() => {
      logger.debug(i18n.t('任务同步完成'));
    });
  });
  refresh();
}

const stop = () => {
  if (timer) {
    timer.cancel();
    timer = null;
  }
  jobs.forEach((job) => {
    job.cancel();
  });
  jobs.clear();
}

const add = (name, module, spec, command, data, description) => {
  const type = moment.isDate(spec);
  const exists = tasks.find(it => it.name === name && it.module === module);
  if (exists) {
    if (exists.status === 'enabled') {
      throw new Error(i18n.t('任务创建失败，任务已经存在'));
    }
    exists.status = 'enabled';
    exists.reason = '';
    exists.type = type ?
      'date' :
      'cron';
    exists.cron = type ?
      null :
      spec;
    exists.date = type ?
      moment(spec).format('YYYY-MM-DD HH:mm:ss') :
      null;
    exists.command = command;
    exists.data = JSON.stringify(data);
    exists.description = description;
    createJob(exists);
  } else {
    const task = {
      name,
      module,
      type: type ?
        'date' : 'cron',
      cron: type ?
        null : spec,
      date: type ?
        moment(spec).format('YYYY-MM-DD HH:mm:ss') : null,
      command,
      data: JSON.stringify(data),
      description,
      status: 'enabled'
    };
    tasks.push(task);
    createJob(task);
  }
}

const remove = (name, module) => {
  const task = tasks.find(it => it.name === name && it.module === module);
  if (!task) {
    logger.warn(i18n.t('任务不存在'), module, name);
    return;
  }
  task.status = 'disabled';
  cancelJob(task);
  logger.debug(i18n.t('任务删除'), module, name);
}

const clear = () => {
  for (let i = 0; i < tasks.length; i++) {
    const it = tasks[i];
    cancelJob(it);
  }
  tasks.length = 0;
  logger.debug(i18n.t('清空任务列表'));
};

export default {
  alias,
  require: _require,
  init,
  run,
  stop,
  refresh,
  add,
  remove,
  clear,
  count: () => {
    return jobs.size;
  }
}
