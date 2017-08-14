import { expect } from 'chai';
import { systemdb } from './config';
import dataSrv from '../src/data';

dataSrv.init({
  url: 'mongodb://localhost:27017/testdb'
})

describe('数据服务', function() {
  it('增删改查', async function() {
    let ret;

    expect((await dataSrv.connect())).to.not.be.null;
    await dataSrv.drop();
    expect((await dataSrv.count())).to.be.eql(0);

    await dataSrv.insert({
      id: 1,
      text: 100,
      datetime: new Date()
    });
    await dataSrv.insert({
      id: 2,
      text: 100,
      datetime: new Date()
    });
    expect((await dataSrv.count())).to.be.eql(2);

    await dataSrv.delete({ id: 1 });
    expect((await dataSrv.count())).to.be.eql(1);
    await dataSrv.delete({ id: 2 });
    expect((await dataSrv.count())).to.be.eql(0);

    const datas = []
    const t = new Date().getTime();
    for (let i = 1; i <= 100; i++) {
      datas.push({
        id: i,
        text: 'text_' + i,
        datetime: t + i
      });
    }
    await dataSrv.insert(...datas);

    for (let i = 1; i <= 100; i++) {
      expect((await dataSrv.find({ id: i }))).to.not.be.null;
    }

    expect((await dataSrv.first())).to.not.be.null;

    ret = await dataSrv.first({}, { datetime: -1 });
    expect(ret.text).to.be.eql('text_100');

    await dataSrv.update({ id: 99 }, { text: 'test_99_updated' });
    ret = await dataSrv.first({ id: 99 });
    expect(ret.text).to.be.eql('test_99_updated');

    await dataSrv.drop();
    expect((await dataSrv.count())).to.be.eql(0);
  })
})
