import {expect} from 'chai';
import path from 'path';
import orm from '../src/orm';
import '../src/base';
import * as utils from './utils/file';
import {querydb} from './config';

describe('数据', function() {
  it('迁移数据', async function() {
    const db = await orm.connect(querydb);

    const queryInterface = db.getQueryInterface();

    await queryInterface.dropAllTables();
    expect(await queryInterface.showAllTables()).to.be.empty;

    orm.alias('module1/model', path.join(__dirname, 'module1/app/model'));

    expect(orm.alias()).to.have.property('module1/model/account');

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
