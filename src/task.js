import Sequelize from 'sequelize';
import schedule from 'node-schedule';
import moment from 'moment';
import i18n from './util/i18n';
import cqrs from './cqrs';
import { taskLogger as logger } from './util/log';

const MAX_READTASKS = 100;

const jobs = new Map();
let timer;
let db;
let Task;

const createTable = async() => {
  Task = db.define('$schedule_tasks', {
    name: Sequelize.STRING(255),
    type: {
      type: Sequelize.ENUM('cron', 'date'),
      allowNull: false
    },
    cron: Sequelize.STRING(255), // 周期性任务
    date: Sequelize.DATE, // 定时任务
    module: Sequelize.STRING(255), // 关联模块
    command: { type: Sequelize.STRING(255), allowNull: false }, // 执行的命令
    data: Sequelize.STRING(2048), // 命令参数
    status: {
      type: Sequelize.ENUM('enable', 'disabled', 'error'),
      allowNull: false
    },
    reason: Sequelize.STRING(2048),
    description: Sequelize.STRING(2048)
  }, {
    indexes: [{
      unique: true,
      fields: ['module', 'name']
    }],
    hooks: {
      afterCreate: async(task, options) => {
        if (task.status === 'enable') {
          await createJob(task);
        }
      },
      afterDestroy: async(task, options) => {
        await cancelJob(task);
      },
      afterUpdate: async(task, options) => {
        if (task.status === 'enable') {
          await createJob(task);
        } else {
          await cancelJob(task);
        }
      }
    }
  });
}

const connect = async(sysdb) => {
  const {
    database = 'saasplat_system',
      username = 'root',
      password = '',
      ...options
  } = sysdb;
  db = new Sequelize(database, username, password, {
    ...options,
    logging: (...args) => {
      logger.debug(...args);
    }
  });
  // 检查是否能连接
  await db.authenticate();
  return db;
};

const cancelJob = (task) => {
  if (jobs.has(task.id)) {
    const j = jobs.get(task.id);
    j.cancel();
    jobs.delete(task.id);
    logger.debug(i18n.t('计划已取消'), task.module, task.name);
  }
}

const runJob = async(task) => {
  logger.debug(i18n.t('计划开始执行'), task.module, task.name);
  // 需要先更新一下，有可能已经取消
  await task.reload();
  if (task.status !== 'enable') {
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

const createJob = async(task) => {
  if (jobs.has(task.id)) {
    const ej = jobs.get(task.id);
    ej.reschedule(task.type === 'cron' ? task.cron : task.date);
    logger.debug(i18n.t('计划重置'), task.module, task.name);
    return true;
  }
  const j = schedule.scheduleJob(task.module + '_' + task.name,
    task.type === 'cron' ? task.cron : moment(task.date).toDate(),
    runJob.bind(null, task));
  if (!j) {
    task.status = 'error';
    task.reason = '任务调度计划无效';
    await task.save();
    //throw new Error(500, i18n.t('任务创建失败，任务调度计划无效'));
    logger.debug(i18n.t('计划创建失败'), task.module, task.name);
    return false;
  } else {
    jobs.set(task.id, j);
    logger.debug(i18n.t('计划创建成功'), task.module, task.name);
    return true;
  }
}

const refresh = async() => {
  if (!db) {
    throw new Error(i18n.t('系统库尚未连接'));
  }
  try {
    logger.debug(i18n.t('任务开始刷新'));
    const result = await Task.findAndCountAll({
      where: {
        status: 'enable'
      },
      //limit: MAX_READTASKS
    });
    if (result.count > MAX_READTASKS) {
      logger.warn(i18n.t('任务过多'), MAX_READTASKS);
    }
    // 删除不存在的任务
    jobs.forEach((ej, k) => {
      if (!result.rows.find(r => r.id === k)) {
        ej.cancel();
        jobs.delete(k);
      }
    });
    // 更新或新建已有任务
    for (let i = 0; i < result.rows.length; i++) {
      const it = result.rows[i];
      await createJob(it);
    }
  } catch (err) {
    logger.warn(i18n.t('任务加载失败'), err);
  }
}

const init = async({ systemdb }) => {
  await connect(systemdb);
  await createTable();
  await Task.sync();
}

const run = async() => {
  timer = schedule.scheduleJob('10 * * * *', function() {
    logger.debug(i18n.t('任务同步开始...'));
    refresh().then(() => {
      logger.debug(i18n.t('任务同步完成'));
    });
  });
  await refresh();
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

const add = async(name, module, spec, command, data, description) => {
  if (!db) {
    throw new Error(404, i18n.t('系统库尚未连接'));
  }
  const type = moment.isDate(spec);
  const exists = await Task.findOne({ where: { name, module } });
  if (exists) {
    if (exists.status === 'enable') {
      throw new Error(i18n.t('任务创建失败，任务已经存在'));
    }
    exists.status = 'enable';
    exists.reason = '';
    exists.type = type ? 'date' : 'cron';
    exists.cron = type ? null : spec;
    exists.date = type ? moment(spec).format('YYYY-MM-DD HH:mm:ss') : null;
    exists.command = command;
    exists.data = JSON.stringify(data);
    exists.description = description;
    await exists.save();
    // 这里不需要，用hook
    //await createJob(exists);
  } else {
    const task = await Task.create({
      name,
      module,
      type: type ? 'date' : 'cron',
      cron: type ? null : spec,
      date: type ? m.format('YYYY-MM-DD HH:mm:ss') : null,
      command,
      data: JSON.stringify(data),
      description,
      status: 'enable'
    });
    // 这里不需要，用hook
    //await createJob(task);
  }
}
const remove = async(name, module) => {
  if (!db) {
    throw new Error(404, i18n.t('系统库尚未连接'));
  }
  const task = await Task.findOne({ where: { name, module } });
  if (!task) {
    logger.warn(i18n.t('任务不存在'), module, name);
    return;
  }
  task.status = 'disabled';
  await task.save();
  cancelJob(task);
  logger.debug(i18n.t('任务删除'), module, name);
}

const clear = async() => {
  if (!db) {
    throw new Error(404, i18n.t('系统库尚未连接'));
  }
  const tasks = await Task.all();
  for (let i = 0; i < tasks.length; i++) {
    const it = tasks[i];
    cancelJob(it);
    await it.destroy();
  }
  logger.debug(i18n.t('清空任务列表'));
}

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
