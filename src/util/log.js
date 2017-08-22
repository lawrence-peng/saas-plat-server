import fs from 'fs';
import path from 'path';
import log4js from 'log4js';

const logpath = path.dirname(__dirname) + path.sep + 'runtime' + path.sep + 'logs';

const defaultConfig = {
  appenders: [
    {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: "\x1B[90m[%d]\x1B[39m \x1B[36m[SAASPLAT]\x1B[39m %[%m%]"
      },
      category: 'SAASPLAT'
    }, {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: "\x1B[90m[%d]\x1B[39m \x1B[36m[ThinkJS]\x1B[39m %[%m%]"
      },
      category: 'ThinkJS'
    }, {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: "\x1B[90m[%d]\x1B[39m \x1B[36m[USERROLE]\x1B[39m %[%m%]"
      },
      category: 'USERROLE'
    }, {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: "\x1B[90m[%d]\x1B[39m \x1B[36m[CQRS]\x1B[39m %[%m%]"
      },
      category: 'CQRS'
    }, {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: "\x1B[90m[%d]\x1B[39m \x1B[36m[SEQUELIZE]\x1B[39m %[%m%]"
      },
      category: 'Sequelize'
    }, {
      "type": "dateFile",
      "filename": logpath + path.sep + 'server.txt',
      "pattern": "_yyyy-MM-dd",
      "alwaysIncludePattern": false
    }
  ]
};

// 创建所有目录
function mkdirs(dirpath) {
  if (!fs.existsSync(dirpath)) {
    mkdirs(path.dirname(dirpath));
    fs.mkdirSync(dirpath);
  }
}

export function init(config) {
  const cfg = {
    ...defaultConfig,
    ...config
  };
  mkdirs(logpath);
  log4js.configure(cfg);
}
export const spLogger = log4js.getLogger('SAASPLAT');
export const mvcLogger = log4js.getLogger('ThinkJS');
export const cqrsLogger = log4js.getLogger('CQRS');
export const ormLogger = log4js.getLogger('Sequelize');
export const taskLogger = log4js.getLogger('Task');
export const userroleLogger = log4js.getLogger('USERROLE');
