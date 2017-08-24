import { expect } from 'chai';
import moment from 'moment';
import task from '../src/task';

const sleep = (timeout = 0) => {
  return new Promise((next) => {
    setTimeout(next, timeout);
  })
}

describe('计划任务', function() {
  it('添加删除执行任务', async function() {
    task.init();
    task.run();
    task.stop();
    task.run();

    task.clear();
    expect(task.count()).to.be.eql(0);

    // 增删
    let c = task.count();
    task.add('task1', 'module1', '59 * * * *',
      'command1', { arg1: 100 }, 'xxxxxxxxx');
    expect(task.count()).to.be.eql(c + 1);
    task.remove('task1', 'module1');
    expect(task.count()).to.be.eql(c);

    // 执行

    task.add('task1', 'module1', moment(new Date()).add(1,
        'seconds').toDate(),
      'command1', { arg1: 100 }, 'xxxxxxxxx');

    sleep(1100);
    // expect(eventCount).to.be.eql(1);
  })
});
