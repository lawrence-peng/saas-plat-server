import {expect} from 'chai';
import path from 'path';
import cqrs from '../src/cqrs';
import config from 'cqrs-fx/lib/config';
import {getStorage} from 'cqrs-fx/lib/event';
import '../src/base';
import * as utils from './utils/file';

describe('业务', function() {
  it('可以重溯后迁移业务数据', async function() {

    let eventCount = 0;

    let id = 'cqrs_test1';

    //utils.deleteFolderRecursive(__dirname + '/data/' + id);

    utils.exists(__dirname + '/module1', __dirname + '/data/' + id + '/module1', utils.copy);

    saasplat.appPath = path.normalize(__dirname + '/data/' + id);

    cqrs.fxData.alias['module1/command/account_handler'] = path.normalize(__dirname + '/data/' + id + '/module1/src/command/account_handler.js');
    cqrs.fxData.alias['module1/event/account_handler'] = () => class {
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
    cqrs.fxData.alias['module1/domain/user'] = path.normalize(__dirname + '/data/' + id + '/module1/src/domain/user.js');

    cqrs.fxData.container = {};

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

    // 升级
    utils.exists(__dirname + '/module1_updatefiles', __dirname + '/data/' + id + '/module1', utils.copy);
    await cqrs.migrate(['module1']);
    expect(eventCount).to.be.equal(3);

    // 取消迁移
    await cqrs.backMigrate();

    eventCount = 0;
    await cqrs.resource(['module1']);
    expect(eventCount).to.be.equal(2);

    await cqrs.migrate(['module1']);
    expect(eventCount).to.be.equal(3);

    eventCount = 0;
    await cqrs.resource(['module1']);
    expect(eventCount).to.be.equal(3);

  })

})
