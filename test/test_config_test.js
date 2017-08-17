import testing from '../config/testing';

describe('配置测试', function() {
  it('测试环境准备是否报错', function() {
    return testing({ database: 'testdb', password: '123456' });
  });
});
