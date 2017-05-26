import {
  expect
} from 'chai';
import path from 'path';
import App from '../src';
import * as utils from './utils/file';
import {
  querydb,
  eventdb,
  eventmq
} from './config';

describe('应用', function () {
  it('启动后停止服务', function () {
    const instance = new App({
      appPath: path.normalize(path.join(__dirname, '../demo')),
      srcPath: path.normalize(path.join(__dirname, '../demo')),
      // 模块配置文件
      modules: '*'
    });

    instance.loadModule();

    expect(instance.module).to.not.be.null;
    expect(instance.module.length).to.equal(2)
    expect(instance.module).to.eql(['module1', 'this-module-has-long-name']);
  })

  it('安装或升级一个模块', async function () {
    const id = 'index_test';
    utils.deleteFolderRecursive(__dirname + '/data/' + id);
    utils.exists(__dirname + '/module1', __dirname + '/data/' + id + '/module1', utils.copy);
    const instance = new App({
      appPath: path.normalize(path.join(__dirname, 'data/' + id)),
      modules: ['module1'],
      querydb,
      eventmq,
      eventdb
    });
    instance.compile();
    // 新模块都必须采用回溯方式安装
    expect(await instance.rollback()).to.be.true;
    expect(await instance.resource()).to.be.true;

    saasplat.command.publish({
      type: 'module1/createAccount',
      data: {
        userName: 'aaa',
        password: '123'
      }
    });

    utils.copy(path.normalize(path.join(__dirname, 'module1_updatefiles_1.0.1')), path.normalize(path.join(__dirname, 'data/' + id + '/module1')));

    expect(await instance.migrate()).to.be.true;

    utils.copy(path.normalize(path.join(__dirname, 'module1_updatefiles_1.0.2')), path.normalize(path.join(__dirname, 'data/' + id + '/module1')));

    expect(await instance.migrate()).to.be.true;

    // 也去迁移代码1.0.2执行设置了默认QQ
    const aaa = await saasplat.model.get('module1/account').findOne({
      where: {
        userName: 'aaa'
      }
    });
    console.log(aaa)
    expect(aaa.QQ).to.be.equal('noqq');

    // QQ字段增加
    await saasplat.comand.publish({
      type: 'module1/createAccount',
      data: {
        userName: 'bbb',
        password: '123',
        QQ: '12345699'
      }
    });

    const bbb = await saasplat.model.get('module1/account').findOne({
      where: {
        userName: 'bbb'
      }
    });
    expect(bbb.QQ).to.be.equal('12345699');

    // 关联模块
    utils.copy(path.normalize(path.join(__dirname, 'data/module2')), path.normalize(path.join(__dirname, 'data/' + id + '/module2')));

    const app2 = new App({
      appPath: path.normalize(path.join(__dirname, 'data/' + id)),
      systemdb: path.normalize(path.join(__dirname, 'data/' + id)),
      modules: ['module2']
    });
    expect(await app2.migrate()).to.be.true;

    // 之前添加aaa，bbb用户存在other_account表中
    const other_accounts = await saasplat.model.get('module2/other_account').findAll();
    expect(other_accounts.length).to.be.equal(2);
    expect(other_accounts[0].name).to.be.equal('aaa');
    expect(other_accounts[1].name).to.be.equal('bbb');

    // 正常关联
    await saasplat.comand.publish({
      type: 'module1/createAccount',
      data: {
        userName: 'ccc',
        password: '123',
        QQ: '887756464'
      }
    });

    const other_ccc = await saasplat.model.get('module2/other_account').findAll({
      where: {
        name: 'ccc'
      }
    });
    expect(other_ccc).to.not.be.null;
  })
})
