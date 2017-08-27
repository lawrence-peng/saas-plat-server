import path from 'path';
import fs from 'fs';
import { spLogger as logger } from './log';

const _data = {
  alias: {},
  export: {}
};

const getFiles = (file) => {
  let dirs = [];
  if (fs.existsSync(file)) {
    let files = fs.readdirSync(file);
    for (var fi of files) {
      if (fs.statSync(path.join(file, fi)).isFile()) {
        dirs.push(fi);
      }
    }
  }
  return dirs;
};

// 定义别名
const alias = (type, paths) => {
  if (!type) {
    return _data.alias;
  }
  //regist alias
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  paths.forEach(dir => {
    let files = getFiles(dir);
    files.forEach(file => {
      if (file.slice(-3) !== '.js' || file[0] === '_') {
        return;
      }
      let name = file.slice(0, -3).replace(/\\/g, '/'); //replace \\ to / on windows
      name = type + '/' + name;
      _data.alias[name] = `${dir}${path.sep}${file}`;
    });
  });
};

let _interopSafeRequire = (name, file) => {
  let obj = require(file);
  if (obj && obj.__esModule && obj.default) {
    return obj.default;
  }
  if (typeof obj === 'function') {
    obj.prototype.__type = name;
    obj.prototype.__filename = file;
  }
  return obj;
};

let _safeRequire = (name, file) => {
  // absolute file path is not exist
  if (path.isAbsolute(file)) {
    //no need optimize, only invoked before service start
    if (!fs.statSync(file).isFile()) {
      return null;
    }
    //when file is exist, require direct
    return _interopSafeRequire(name, file);
  }
  try {
    return _interopSafeRequire(name, file);
  } catch (err) {
    logger.error(err);
  }
  return null;
};

let _loadRequire = (name, filepath) => {
  let obj = _safeRequire(name, filepath);
  if (obj) {
    _data.export[name] = obj;
  }
  return obj;
};

// 通过别名加载类型
const _require = (name, flag) => {
  if (typeof name !== 'string') {
    return name;
  }
  // adapter or middle by register
  let Cls = _data.export[name];
  if (!Cls) {
    let filepath = _data.alias[name];
    if (filepath) {
      return _loadRequire(name, path.normalize(filepath));
    }
    // only check in alias
    if (flag) {
      return null;
    }
    filepath = require.resolve(name);
    Cls = _loadRequire(name, filepath);
    if (!Cls) {
      return null;
    }
  }
  return Cls;
};

const clearData = () => {
  _data.export = {};
  _data.alias = {};
}

const filter = (types, module) => {
  const obj = {};
  for (let name in alias) {
    const sp = name.split('/');
    if (types.indexOf(sp[1]) > -1 && (!module || module === sp[1])) {
      obj[name] = alias[name];
    }
  }
  return obj;
}

const preload = () => {
  for (let name in alias) {
    _require(alias[name], true);
  }
}

export default {
  alias,
  clearData,
  filter,
  preload,
  require: _require,
  data: _data
};
