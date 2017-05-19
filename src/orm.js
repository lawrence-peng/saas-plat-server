import path from 'path';
import fs from 'fs';
import Sequelize from 'sequelize'; // orm

const _data = {
  alias: {},
  export: {},
  defines: {}
};

const _types = ['model', 'migration'];
const _dirname = {
  model: 'model' migration: 'migration'
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

const createModel = async(model, force = false) => {
  if (model && model.sync) {
    // force = drop and create
    await model.sync({force});
    // todo 执行升级脚本
    console.log(`表${model}已创建或更新.`);
  }
};

const createModels = async(model, force = false) => {
  if (model.__esModule) {
    for (let p in model) {
      if (model.hasOwnProperty(p)) {
        await createModel(model[p], force);
      }
    }
  } else {
    await createModel(model, force);
  }
};

const create = async(name, force = false) => {
  if (name) {
    await createModels(_require(name), force);
  } else {
    for (var i in _data.alias) {
      if (i.indexOf(`/${_dirname.module}/`)) {
        await createModels(_require(i), force);
      }
    }
  }
};

const up = async(Migration, queryInterface) => {
  const migration = new Migration(queryInterface);
  await migration.up();
}

const down = async(Migration, queryInterface) => {
  const migration = new Migration(queryInterface);
  await migration.down();
}

const migrate = async(revert) => {
  const queryInterface = db.getQueryInterface();
  const migrations = _data.alias.filter(item => item.indexOf(`/${_dirname.migration}/`)).sort((a, b) => {
    const v1 = a.split('/')[2].split('.');
    const v2 = b.split('/')[2].split('.');
    for (let i = 0; i < v1.length || i < v2.length; i++) {
      if (v1[i] < v2[i]) {
        return -1;
      } else if (v1[i] > v2[i]) {
        return 1;
      }
    }
    return 0;
  });
  if (revert) {
    saasplat.module.forEach(module => {
      const install = await Installs.findOne({
        where: {
          name: module
        }
      });
      if (!install) {
        return;
      }
      const v2 = install.split('.');
      const downs = migrations.filter(item => {
        const sp = item.split('/');
        if (sp[0] !== module) {
          return false;
        }
        const v = sp[2].split('.');
        for (let i = 0; i < v.length; i++) {
          if (v[i] < v2[i]) {
            return true;
          }
        }
        return false;
      });
      for (var i in downs) {
        await down(_require(i), queryInterface);
      }
      install.version = downs[downs.length - 1].split('/')[2];
      await install.save();
    });
  } else {
    saasplat.module.forEach(module => {
      const install = await Installs.findOrCreate({
        where: {
          name: module
        },
        defaults: {
          name: module,
          version: '0.0.0',
          status: 'install'
        }
      }});
    const v2 = install.split('.');
    const ups = migrations.filter(item => {
      const sp = item.split('/');
      if (sp[0] !== module) {
        return false;
      }
      const v = sp[2].split('.');
      for (let i = 0; i < v.length; i++) {
        if (v[i] > v2[i]) {
          return true;
        }
      }
      return false;
    });
    for (var i in ups) {
      await up(_require(i), queryInterface);
    }
    install.version = ups[downs.length - 1].split('/')[2];
    await install.save();
  });
}

const Installs = db.define('installs', {
  name: {
    type: TYPE.STRING(255),
    unique: true
  },
  version: TYPE.STRING(255),
  status: TYPE.ENUM('install', 'uninstall'),
  updateAt: TYPE.DATE
}, {tableName: 'installs'});

const connect = (querydb) => {
  if (db) {
    return db;
  }
  let {
    database,
    username,
    password,
    ...options
  } = querydb;
  return db = new Sequelize(database, username, password, options);
};
const TYPE = Sequelize; // 类型使用Sequelize

let db = null;

export default {
  alias,
  require : _require,
  data : _data,
  create,
  migrate,
  connect,
  db,
  TYPE
};
