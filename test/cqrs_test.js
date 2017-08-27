import {expect} from 'chai';
import path from 'path';
import cqrs from '../src/cqrs';
import config from 'cqrs-fx/lib/config';
import * as cqrsCore from 'cqrs-fx/lib/core';
import '../src/base';
import * as utils from './utils/file';
import state from '../src/util/state';

describe('业务', function() {
  it('可以回溯事件', async function() {

    let eventCount = 0;

    let id = 'cqrs_test1';

    //utils.deleteFolderRecursive(__dirname + '/data/' + id);

    utils.deleteFolderRecursive(__dirname + '/data/' + id);
    utils.exists(__dirname + '/module1', __dirname + '/data/' + id + '/module1', utils.copy);

    saasplat.appPath = path.normalize(__dirname + '/data/' + id);

    cqrs.clearData();

    cqrsCore.fxData.alias['module1/command/account_handler'] = path.normalize(__dirname + '/data/' + id + '/module1/src/command/account_handler.js');
    cqrsCore.fxData.alias['module1/event/account_handler'] = () => {
      const Class = class my_handler {
        @cqrs.event('module1')
        accountCreated({userName}) {
          //  console.log('userName',userName)
          eventCount++;
        }
        @cqrs.event('module1')
        accountUpdated({userName}) {
          eventCount++;
        }
      }
      Class.prototype.__module = 'module1';
      return Class;
    };
    cqrsCore.fxData.alias['module1/domain/user'] = path.normalize(__dirname + '/data/' + id + '/module1/src/domain/user.js');

    config.init({
      bus: {
        commandBus: 'direct',
        eventBus: 'direct'
      },
      event: {
        storage: 'memory_domain_event'
      },
      snapshot: {
        storage: 'memory'
      },
      log: {
        enable: true
      }
    });

    const listener = ({
      module,
      name,
      type,
      id
    }, code, err, handler) => {
      //    console.log(code, err,handler);
      expect(0).to.not.be.ok;
    }
    cqrs.bus.getCommandDispatcher().addListener(null, null, listener);

    await cqrs.bus.publishCommand({
      name: 'module1/createAccount',
      data: {
        userName: 'aaa',
        password: '123456'
      }
    });

    expect(eventCount).to.be.equal(1);

    await cqrs.bus.publishCommand({
      name: 'module1/updateAddress',
      data: {
        userName: 'aaa',
        address: 'this is address1'
      }
    });

    expect(eventCount).to.be.equal(2);

    // 重溯
    eventCount = 0;
    await cqrs.resource(['module1']);
    expect(eventCount).to.be.equal(2);

  })

  it('可以迁移业务', async function() {

    let eventCount = 0;

    let id = 'cqrs_test2';

    //utils.deleteFolderRecursive(__dirname + '/data/' + id);
    utils.deleteFolderRecursive(__dirname + '/data/' + id);
    utils.exists(__dirname + '/module1', __dirname + '/data/' + id + '/module1', utils.copy);

    saasplat.appPath = path.normalize(__dirname + '/data/' + id);

    cqrs.clearData();

    cqrsCore.fxData.alias['module1/command/account_handler'] = path.normalize(__dirname + '/data/' + id + '/module1/src/command/account_handler.js');
    cqrsCore.fxData.alias['module1/event/account_handler'] = () => class {
      @cqrs.event('module1')
      accountCreated({userName}) {
        //  console.log('userName',userName)
        eventCount++;
      }
      @cqrs.event('module1')
      accountUpdated({userName}) {
        eventCount++;
      }
    };
    cqrsCore.fxData.alias['module1/domain/user'] = path.normalize(__dirname + '/data/' + id + '/module1/src/domain/user.js');

    config.init({
      bus: {
        commandBus: 'direct',
        eventBus: 'direct'
      },
      event: {
        storage: 'memory_domain_event'
      },
      snapshot: {
        storage: 'memory'
      },
      log: {
        enable: true
      }
    });

    const listener = ({
      module,
      name,
      type,
      id
    }, code, err, handler) => {
      //    console.log(code, err,handler);
      expect(0).to.not.be.ok;
    }
    cqrs.bus.getCommandDispatcher().addListener(null, null, listener);

    await cqrs.bus.publishCommand({
      name: 'module1/createAccount',
      data: {
        userName: 'aaa',
        password: '123456'
      }
    });

    expect(eventCount).to.be.equal(1);

    await cqrs.bus.publishCommand({
      name: 'module1/updateAddress',
      data: {
        userName: 'aaa',
        address: 'this is address1'
      }
    });

    expect(eventCount).to.be.equal(2);

    // 升级
    eventCount = 0;
    utils.exists(__dirname + '/module1_updatefiles_1.0.1', __dirname + '/data/' + id + '/module1', utils.copy);

    cqrsCore.fxData.alias['module1/migration/1.0.1'] = path.normalize(__dirname + '/data/' + id + '/module1/src/migration/1.0.1.js');
    cqrsCore.fxData.alias['module1/migration/1.0.1_test2'] = path.normalize(__dirname + '/data/' + id + '/module1/src/migration/1.0.1_test2.js');

    await state.save(['module1'].map(name => ({name, version: '1.0.1', installDate: new Date(), status: 'waitCommit'})));

    await cqrs.revertVersion();

    let success = 0;
    await cqrs.migrate(['module1'], ({total, current}) => {
      success = current;
    });
    expect(success).to.be.equal(2);

    // 取消迁移
    await cqrs.backMigrate();

    success = 0;
    await cqrs.migrate(['module1'], ({total, current}) => {
      success = current;
    });
    expect(success).to.be.equal(2);

  })
})
