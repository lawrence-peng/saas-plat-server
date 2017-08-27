import schedule from 'node-schedule';
import moment from 'moment';
import i18n from './util/i18n';
import alias from './util/alias';
import { taskLogger as logger } from './util/log';

const MAX_READTASKS = 100;

const tasks = [];
const jobs = new Map();
let timer;

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
    if (typeof task.handler === 'string') {
      // 计划任务到期就执行一个命令
      require('./cqrs').bus.publishCommand({
        module: task.module,
        name: task.command,
        data: task.data
      });
    } else if (typeof task.handler === 'function') {
      task.handler(task.data);
    } else {
      task.status = 'error';
      task.reason = i18n.t('任务无法执行');
      task.save();
    }
  } catch (err) {
    logger.debug(i18n.t('计划执行失败'), err);
    task.status = 'error';
    task.reason = err.message;
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
  for (const p in alias.alias) {
    if (p.split('/')[1] === 'task') {
      const Task = alias.require(alias.alias[p]);
      const task = new Task();
      add(task.name, task.module, task.spec, task.command, task.data, task.description);
    }
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
  if (typeof command !== 'function' && typeof command !== 'string') {
    throw new Error(500, i18n.t('任务创建失败，任务command无效'));
  }
  const type = moment.isDate(spec);
  const exists = tasks.find(it => it.name === name && it.module === module);
  if (exists) {
    if (exists.status === 'enabled') {
      throw new Error(500, i18n.t('任务创建失败，任务已经存在'));
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
