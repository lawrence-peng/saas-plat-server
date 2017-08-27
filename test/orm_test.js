import { expect } from 'chai';
import path from 'path';
import orm from '../src/orm';
import '../src/base';
import * as utils from './utils/file';
import { querydb } from './config';

describe('数据', function() {
  it('系统库 & 查询库', async function() {
    const db = await orm.connect(querydb, querydb);

    orm.alias('module1/model', path.join(__dirname, 'module1/src/model'));
    expect(orm.alias()).to.have.property('module1/model/account');

    orm.alias('module1/system', path.join(__dirname,
      'module1/src/system'));
    expect(orm.alias()).to.have.property('module1/system/config');

    orm.create('module1', 'account');
    orm.create('module1', 'config', false, 'system');

  })

  it('迁移系统库', async function() {
    const db = await orm.connect(null, querydb);

    orm.alias('module1/system', path.join(__dirname,
      'module1/src/system'));
    expect(orm.alias()).to.have.property('module1/system/config');

    orm.create('module1', 'config', false, 'system');

    orm.alias('module1/sysmigration', path.join(__dirname,
      'module1_updatefiles_1.0/src/sysmigration'));
    expect(orm.alias()).to.have.property('module1/sysmigration/1.0.1');
    expect(orm.alias()).to.have.property(
      'module1/sysmigration/1.0.1_test2');

      const db = orm.data.sysdb;
      const queryInterface = db.getQueryInterface();

      await queryInterface.dropAllTables();
      expect(await queryInterface.showAllTables()).to.be.empty;

      orm.migrate('module1',false,'sysmigration');

     
      await queryInterface.dropAllTables();
      expect(await queryInterface.showAllTables()).to.be.empty;


  })

  it('迁移数据', async function() {
    await orm.connect(querydb);
    const db = orm.data.db;
    const queryInterface = db.getQueryInterface();

    await queryInterface.dropAllTables();
    expect(await queryInterface.showAllTables()).to.be.empty;

    orm.alias('module1/model', path.join(__dirname, 'module1/src/model'));

    expect(orm.alias()).to.have.property('module1/model/account');

    orm.alias('module1/sysmigration', path.join(__dirname,
      'module1_updatefiles_1.0/src/sysmigration'));
    expect(orm.alias()).to.have.property('module1/sysmigration/1.0.1');
    expect(orm.alias()).to.have.property(
      'module1/sysmigration/1.0.1_test2');

      orm.migrate('module1');

    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.be.empty;
    await orm.restore(['module1'], true);
    expect(await queryInterface.showAllTables()).to.be.empty;

    await orm.create(['module1']);
    expect(await queryInterface.showAllTables()).to.eql([
      'module1_account'
    ]);
    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.eql([
      'module1_account__bak'
    ]);
    await orm.restore(['module1'], true);
    expect(await queryInterface.showAllTables()).to.eql([
      'module1_account'
    ]);

    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.eql([
      'module1_account__bak'
    ]);

  })

})
