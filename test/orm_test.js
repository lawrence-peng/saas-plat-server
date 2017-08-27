import {expect} from 'chai';
import path from 'path';
import alias from '../src/util/alias';
import orm from '../src/orm';
import '../src/base';
import state from '../src/util/state';
import * as utils from './utils/file';
import {querydb, systemdb} from './config';

describe('数据', function() {
  it('系统库 & 查询库', async function() {
    await orm.connect(querydb, systemdb);

    alias.alias('module1/model', path.join(__dirname, 'module1/src/model'));
    expect(alias.alias()).to.have.property('module1/model/account');

    alias.alias('module1/system', path.join(__dirname, 'module1/src/system'));
    expect(alias.alias()).to.have.property('module1/system/config');

    const Model = alias.require(`module1/system/config`);
    // console.log(1, Model)
    expect(Model).to.be.ok;
    expect(Model.prototype.__type).to.be.ok;

    await orm.create('module1', 'account');
    await orm.create('module1', 'config', false, 'system');

    const dt = new Date();
    await saasplat.system.get('config', 'module1').create({config1: 'aa', config2: dt});

    const m = await saasplat.system.get('config', 'module1').findOne();
    expect(m.config1).to.eql('aa');
    //expect(m.config2).to.eql(dt);
  })

  it('迁移系统库', async function() {
    await orm.connect(querydb, systemdb);

    alias.alias('module1/system', path.join(__dirname, 'module1/src/system'));
    expect(alias.alias()).to.have.property('module1/system/config');

    alias.alias('module1/sysmigration', path.join(__dirname, 'module1_updatefiles_1.0.2/src/sysmigration'));
    expect(alias.alias()).to.have.property('module1/sysmigration/1.0.2');

    const db = orm.data.sysdb;
    const queryInterface = db.getQueryInterface();

    await queryInterface.dropAllTables();
    await orm.data.db.getQueryInterface().dropAllTables();
    expect(await queryInterface.showAllTables()).to.be.empty;
    expect(await await orm.data.db.getQueryInterface().showAllTables()).to.be.empty;

    saasplat.appPath = path.normalize(__dirname + '/data/orm_test');
    utils.deleteFolderRecursive(saasplat.appPath);
// version 是要安装的version
    await state.save(['module1'].map(name => ({name, version: '1.0.2', installDate: new Date(), status: 'waitCommit'})));

    await orm.create('module1', 'config', false, 'system');
    console.log('-------')
    await orm.migrate('module1', false, 'sysmigration');
    console.log('-------')
    const des = await queryInterface.describeTable('system_module1_config');
    expect(des.config3).to.be.ok;
    expect(des.config4).to.be.ok;
    expect(des.config5).to.be.ok;

    await orm.migrate('module1', true, 'sysmigration');

    const des2 = await queryInterface.describeTable('system_module1_config');
    expect(des2.config3).to.not.be.ok;
    expect(des2.config4).to.not.be.ok;
    expect(des2.config5).to.not.be.ok;

    await queryInterface.dropAllTables();
    expect(await queryInterface.showAllTables()).to.be.empty;

  })

  it('迁移数据', async function() {
    await orm.connect(querydb, systemdb);
    const db = orm.data.db;
    const queryInterface = db.getQueryInterface();

    saasplat.appPath = path.normalize(__dirname + '/data/orm');

    await queryInterface.dropAllTables();
    expect(await queryInterface.showAllTables()).to.be.empty;

    alias.alias('module1/model', path.join(__dirname, 'module1/src/model'));

    expect(alias.alias()).to.have.property('module1/model/account');

    await orm.migrate('module1');

    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.be.empty;
    await orm.restore(['module1'], true);
    expect(await queryInterface.showAllTables()).to.be.empty;

    await orm.create(['module1']);
    expect(await queryInterface.showAllTables()).to.eql(['module1_account']);
    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.eql(['module1_account__bak']);
    await orm.restore(['module1'], true);
    expect(await queryInterface.showAllTables()).to.eql(['module1_account']);

    await orm.backup(['module1']);
    expect(await queryInterface.showAllTables()).to.eql(['module1_account__bak']);

  })

})
