import {expect} from 'chai';
import path from 'path';
import cqrs from '../src/cqrs';
import config from 'cqrs-fx/lib/config';
import '../src/base';
import * as utils from './utils/file';

describe('业务', function() {
  it('迁移', async function() {

    let eventCount = 0;

    let id = (new Date()).getTime();

    utils.exists(__dirname + '/module1', __dirname + '/data/' + id + '/module1', utils.copy);

    cqrs.fxData.alias['module1/command/account_handler'] = path.normalize(__dirname + '/data/' + id + '/module1/command/account_handler.js');
    cqrs.fxData.alias['module1/event/account_handler'] = class {
      accountCreated({userName}) {
        eventCount++;
      }
      accountUpdated({userName}) {
        eventCount++;
      }
    };
    cqrs.fxData.alias['module1/domain/user'] = path.normalize(__dirname + '/data/' + id + '/module1/domain/user.js');

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
      }
    });

    await cqrs.bus.publishCommand({
      name: 'createAccount',
      data: {
        userName: 'aaa',
        password: '123'
      }
    });

    expect(eventCount).to.be.equal(1);

    await cqrs.bus.publishCommand({
      type: 'updateAddress',
      data: {
        userName: 'aaa',
        address: 'this is address1'
      }
    });

    expect(eventCount).to.be.equal(2);

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
