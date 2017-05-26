import fs from 'fs';
import path from 'path';
import log4js from 'log4js';

const logpath = path.dirname(__dirname) + path.sep + 'runtime' + path.sep + 'logs';

const config = {
  "appenders": [{
    type: 'console',
  }, {
    "type": "dateFile",
    "filename":  logpath + path.sep +'server.txt',
    "pattern": "_yyyy-MM-dd",
    "alwaysIncludePattern": false
  }]
};

// 创建所有目录
(function mkdirs(dirpath) {
  if (!fs.existsSync(dirpath)){
    mkdirs(path.dirname(dirpath));
    fs.mkdirSync(dirpath);
  }
})(logpath);

log4js.configure(config);
export default global.logger = log4js.getLogger();
