import {
  expect
} from 'chai';
import path from 'path';
import App from '../src';

describe('应用', function () {
  it('启动后停止服务', function () {
    const app = new App({
      appPath: path.normalize(path.join(__dirname, '../demo')),
      srcPath: path.normalize(path.join(__dirname, '../demo')),
      // 模块配置文件
      modules: '*'
    });

    app.loadModule();

    expect(app.module).to.not.be.null;
    expect(app.module.length).to.equal(2)
    expect(app.module).to.eql(['module1','this-module-has-long-name']);
  })

})
