import fs from 'fs';
import path from 'path';
import log4js from 'log4js';

const logpath = path.dirname(__dirname) + path.sep + 'runtime' + path.sep + 'logs';

const defaultConfig = {
  "appenders": [
    {
      type: 'console'
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

export function init(config ) {
  const cfg = {
    ...defaultConfig,
    ...config
  };
  const files = cfg.appenders.map(item => item.filename).filter(item => !!item);
  for (let file of files) {
    mkdirs(path.dirname(file));
  }
  log4js.configure(cfg);
}
export default   log4js.getLogger();
