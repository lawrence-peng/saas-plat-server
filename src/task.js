import Sequelize from 'sequelize';
import schedule from 'node-schedule';
import i18n from './util/i18n';
import { bus } from './cqrs';
import { taskLogger as logger } from './util/log';

const MAX_READTASKS = 100;

const Task = db.define('$schedule_tasks', {
  name: { type: TYPE.STRING(255), unique: true },
  type: {
    type: TYPE.ENUM('cron', 'date'),
    allowNull: false
  },
  cron: TYPE.STRING(255), // 周期性任务
  date: TYPE.DATE, // 定时任务
  module: TYPE.STRING(255), // 关联模块
  command: { type: TYPE.STRING(255), allowNull: false }, // 执行的命令
  data: TYPE.STRING(2048), // 命令参数
  status: {
    type: TYPE.ENUM('enable', 'disabled', 'error'),
    allowNull: false
  },
  reason: TYPE.STRING(2048),
  description: TYPE.STRING(2048)
}, {
  afterCreate: (task, options) => {

  },
  afterDestroy: (task, options) => {

  },
  afterUpdate: (task, options) => {

  }
});

const jobs = new Set();

const createJob = (task) => {
  const j = schedule.scheduleJob(task.type === 'cron' ? task.cron : task.date,
    async() => {
      logger.debug('开始执行任务', task.name);
      // 需要先更新一下，有可能已经取消
      await task.reload();
      if (task.status !== 'enable') {
        jobs.delete(task.name);
        logger.debug('任务取消执行', task.name);
        return;
      }
      if (task.type !== 'cron') {
        jobs.delete(task.name);
      }
      try {
        bus.publishCommand({ name: task.command, data: task.data });
      } catch (err) {
        logger.debug('失败执行任务', err);
        task.status = 'error';
        task.reason = err.message;
        task.save();
      }
    });
  this.jobs.add(task.name, j);
}

const refresh = async() => {
  try {
    logger.debug('开始刷新任务列表');
    const result = await Task.findAndCountAll({
      where: {
        status: 'enable'
      },
      limit: MAX_READTASKS
    });
    if (result.count > MAX_READTASKS) {
      logger.warn(i18n.t('计划任务过多，暂时只能部分处理'), MAX_READTASKS);
    }
    result.rows.forEach(it => createJob(it));
  } catch (err) {
    logger.warn(i18n.t('计划任务加载失败'), err);
  }
}

const run = async() => {
  await Task.sync();
  refresh();
}

const add = async() => {}
const remove = async(name) => {

}

export default {
  run,
  refresh,
  add,
  remove
}
