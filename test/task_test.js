import { expect } from 'chai';
import path from 'path';
import moment from 'moment';
import { systemdb } from './config';
import task from '../src/task';
import cqrs from '../src/cqrs';

const sleep = (timeout = 0) => {
  return new Promise((next) => {
    setTimeout(next, timeout);
  })
}

describe('计划任务', function() {
  it('添加删除执行任务', async function() {
    await task.init({ systemdb });
    await task.run();
    task.stop();
    await task.run();

    await task.clear();
    expect(task.count()).to.be.eql(0);

    // 增删
    let c = task.count();
    await task.add('task1', 'module1', '59 * * * *',
      'command1', { arg1: 100 }, 'xxxxxxxxx');
    expect(task.count()).to.be.eql(c + 1);
    await task.remove('task1', 'module1');
    expect(task.count()).to.be.eql(c);

    // 执行
    cqrs.fxData.alias = {};
    cqrs.fxData.export = {};
    cqrs.fxData.container = {};
    let eventCount = 0;
    cqrs.fxData.alias['module1/event/test_handler'] = () => {
      const Class = class my_handler {
        command1({ arg1 }) {
          expect(arg1).to.be.eql(100);
          eventCount = 1;
        }
      }
      Class.__module = 'module1';
      return Class;
    };

    await task.add('task1', 'module1', moment(new Date()).add(1,
        'seconds').toDate(),
      'command1', { arg1: 100 }, 'xxxxxxxxx');

    await sleep(1100);
    expect(eventCount).to.be.eql(1);
  })
});
