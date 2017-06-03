import thinkjs from 'thinkjs';
import path from 'path';

let app;

const init = (appPath = process.cwd(), debugMode = false) => {
  if (!app) {
    app = new thinkjs({
      APP_PATH: __dirname + path.sep + 'mvc',
      RUNTIME_PATH: appPath + path.sep + 'runtime',
      ROOT_PATH: appPath,
      RESOURCE_PATH: appPath + path.sep + 'www',
      env: debugMode
        ? 'development'
        : 'production'
    });

    // 需要加载类型
    app.start();

  }
  return app;
}

const run = () => {
  think.require('app').run();
}

export default {
  init,
  run,
  clearData : () => {
    app.clearData();
  },
  compile : (...args) => {
    app.compile(...args);
  },
  preload : () => {
    app.preload();
  }
};
