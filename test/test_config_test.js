import testing from '../config/testing';
import {querydb} from './config';

describe('配置测试', function() {
  it('测试环境准备是否报错', function() {
    console.log('注意：有可能代码不一致需要生成lib');
    return testing(querydb);
  });
});
