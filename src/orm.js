import path from 'path';
import fs from 'fs';
import Sequelize from 'sequelize'; // orm

const _data = {
  alias: {},
  export: {}
};

const _types = ['model'];
const _dirname = {
  model: 'model'
};

const getFiles = (file) => {
  let dirs = [];
  if (fs.existsSync(file)) {
    let files = fs.readdirSync(file);
    for (var fi of files) {
      if (fs.statSync(path.join(file, fi)).isFile())
        dirs.push(fi);
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

let _interopSafeRequire = file => {
  let obj = require(file);
  if (obj && obj.__esModule && obj.default) {
    return obj.default;
  }
  if (typeof obj === 'function') {
    obj.prototype.__filename = file;
  }
  return obj;
};

let _safeRequire = file => {
  // absolute file path is not exist
  if (path.isAbsolute(file)) {
    //no need optimize, only invoked before service start
    if (!fs.statSync(file).isFile()) {
      return null;
    }
    //when file is exist, require direct
    return _interopSafeRequire(file);
  }
  try {
    return _interopSafeRequire(file);
  } catch (err) {
    console.error(err);
  }
  return null;
};

let _loadRequire = (name, filepath) => {
  let obj = _safeRequire(filepath);
  if (typeof obj == 'function') {
    obj.prototype.__type = name;
    obj.prototype.__filename = filepath;
  }
  if (obj) {
    _data.export[name] = obj;
  }
  return obj;
};

// 通过别名加载类型
const _require = (name, flag) => {
  if (typeof name != 'string') {
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

const createModel = (model, force = false) => {
  if (model && model.sync) {
    // force = drop and create
    model.sync({
      force
    }).then(function () {
      console.log(`表${model}已创建或更新.`);
    }).catch(err => {
      console.error(err);
    });
  }
};

const createModels = (model, force = false) => {
  if (model.__esModule) {
    for (let p in model) {
      if (model.hasOwnProperty(p)) {
        createModel(model[p], force);
      }
    }
  } else {
    createModel(model, force);
  }
};

const create = (name, force = false) => {
  if (name) {
    createModels(_require(name), force);
  } else {
    for (var i in _data.alias) {
      createModels(_require(i), force);
    }
  }
};

const connect = (querydb) => {
  let {
    database,
    username,
    password,
    ...options
  } = querydb;
  return new Sequelize(database, username, password, options)
};
const TYPE = Sequelize; // 类型使用Sequelize

let db = null;

export default {
  alias,
  require: _require,
  data: _data,
  create,
  connect,
  db,
  TYPE
};
