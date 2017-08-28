import {
  expect
} from 'chai';
import path from 'path';
import App from '../src/app';
import * as utils from './utils/file';
import {
  systemdb,
  querydb,
  eventdb,
  eventmq
} from './config';

const sleep = (timeout = 0) => {
  return new Promise((next) => {
    setTimeout(next, timeout);
  })
}

describe('应用', function() {
  it('启动后停止服务', function() {
    const instance = new App({
      appPath: path.normalize(path.join(__dirname, '../demo')),
      devPath: path.normalize(path.join(__dirname, '../demo')),
      // 模块配置文件
      modules: '*'
    });

    instance.loadModule();

    expect(instance.modules).to.not.be.null;
    expect(instance.modules.length).to.equal(2)
    expect(instance.modules).to.eql(['module1',
      'this-module-has-long-name'
    ]);
  })

  it('安装或升级一个模块', async function() {
    const id = 'index_test';
    utils.deleteFolderRecursive(__dirname + '/data/' + id);
    utils.exists(__dirname + '/module1', __dirname + '/data/' + id +
      '/module1', utils.copy);
    const instance = new App({
      appPath: path.normalize(path.join(__dirname, 'data/' + id)),
      modules: ['module1'],
      querydb,
      systemdb,
      eventmq,
      eventdb,
      debug: true,
      logLevel: 'DEBUG'
    });
    await instance.init();
    instance.clearData();
    await instance.clearEvents();
    instance.compile();
    // 新模块都必须采用回溯方式安装
    expect(await instance.rollback(['module1'], true)).to.be.true;
    expect(await instance.resource(['module1'])).to.be.true;

    await saasplat.command.publish({
      name: 'module1/createAccount',
      data: {
        userName: 'aaa',
        password: '123456'
      }
    });

    let aaa = await saasplat.model.get('module1/account').findById(
      'aaa');
    expect(aaa).to.not.be.null;

    // 开始升级
    utils.copy(path.normalize(path.join(__dirname,
      'module1_updatefiles_1.0.1')), path.normalize(path.join(
      __dirname, 'data/' + id + '/module1')));

    // 需要等待重新加载
    await sleep(200);

    expect(await instance.migrate(['module1'])).to.be.true;

    utils.copy(path.normalize(path.join(__dirname,
      'module1_updatefiles_1.0.2')), path.normalize(path.join(
      __dirname, 'data/' + id + '/module1')));

    await sleep(200);

    console.log('------1.0.2-------')
    expect(await instance.migrate(['module1'])).to.be.true;
    console.log('-------1.0.2------')

    // 也去迁移代码1.0.2执行设置了默认QQ
    aaa = await saasplat.model.get('module1/account').findOne({
      where: {
        id: 'aaa'
      }
    });
    expect(aaa).to.not.be.null;
    expect(aaa.id).to.not.be.null;
    expect(aaa.QQ).to.be.equal('noqq');

    // QQ字段增加
    await saasplat.command.publish({
      name: 'module1/createAccount',
      data: {
        userName: 'bbb',
        password: '123444',
        QQ: '12345699'
      }
    });

    const bbb = await saasplat.model.get('module1/account').findOne({
      where: {
        id: 'bbb'
      }
    });
    expect(bbb).to.not.be.null;
    expect(bbb.QQ).to.be.equal('12345699');

    console.log('app2...')

    // 关联模块
    utils.exists(__dirname + '/module2', __dirname + '/data/' + id +
      '/module2', utils.copy);

    const app2 = new App({
      appPath: path.normalize(path.join(__dirname, 'data/' + id)),
      systemdb: path.normalize(path.join(__dirname, 'data/' + id)),
      modules: [
        'module1', 'module2'
      ],
      querydb,
      systemdb,
      eventmq,
      eventdb,
      debug: true,
      logLevel: 'DEBUG'
    });
    app2.compile();
    expect(await app2.resource(['module2'])).to.be.true;

    // 之前添加aaa,bbb用户存在other_account表中
    const other_accounts = await saasplat.model.get(
      'module2/other_account').findAll();
    expect(other_accounts.length).to.be.equal(2);
    expect(other_accounts[0].name).to.be.equal('aaa');
    expect(other_accounts[1].name).to.be.equal('bbb');

    // 正常关联
    await saasplat.command.publish({
      name: 'module1/createAccount',
      data: {
        userName: 'ccc',
        password: '123555',
        QQ: '887756464'
      }
    });

    const other_ccc = await saasplat.model.get('module2/other_account')
      .findAll({
        where: {
          name: 'ccc'
        }
      });
    expect(other_ccc).to.not.be.null;
  })
})
