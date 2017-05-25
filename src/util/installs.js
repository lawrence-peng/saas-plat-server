import path from 'path';
import fs from 'fs';
import assert from 'assert';
import {
  cmpVer
} from './cmp';
import i18n from '../i18n';
import logger from '../log';

const OPTIONS = 'options.json';
const INSTALLS = 'installs.json';

function getDb() {
  return saasplat.systemdb || path.join(saasplat.appPath, '.saasplat');
}

function toArray(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }
  return [];
}

function toObject(obj) {
  return obj || {};
}

function readFileJson(filename, valueFormater = toObject) {
  let file = path.normalize(getDb() + path.sep + filename);
  logger.debug(i18n.t('开始读取文件') + file);
  if (fs.existsSync(file)) {
    try {
      return valueFormater(JSON.parse(fs.readFileSync(file)));
    } catch (err) {
      logger.debug(i18n.t('读取文件失败，跳过'), err);
      return valueFormater();
    }
  } else {
    return valueFormater();
  }
}

function saveJsonFile(filename, json) {
  let file = path.normalize(getDb() + path.sep + filename);
  let ps = path.dirname(file).split(path.sep);
  let p = '';
  for (let dir of ps) {
    p = path.join(p, dir);
    if (!fs.existsSync(p)) {
      logger.debug(i18n.t('开始创建目录') + p);
      fs.mkdirSync(p);
    }
  }
  logger.debug(i18n.t('开始写入文件') + file);
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

let _items;

export default {
  find: (name, status, version) => {
    assert(name);
    if (!_items) {
      _items = readFileJson(INSTALLS, toArray);
    }
    return _items.filter(item => item.name == name &&
      (status == undefined || item.status == status) &&
      (version == undefined || item.version == version)).sort((a, b) => {
      return cmpVer(a.version, b.version);
    });
  },

  has: (status) => {
    return !!_items.find(item => item.status == status);
  },

  commit: () => {
    if (!_items) {
      _items = readFileJson(INSTALLS, toArray);
    }
    _items.forEach(item => {
      if (item.status == 'waitCommit') {
        item.status = 'install';
      }
    });
    this.saveJsonFile(INSTALLS, _items);
  },

  rollback: (modules) => {
    if (!_items) {
      _items = readFileJson(INSTALLS, toArray);
    }
    _items.filter(item => item.status == 'waitCommit' && modules.indexOf(item.name) > -1).forEach(item => {
      const exists = _items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        _items.splice(_items.indexOf(exists), 1);
      }
    });
    saveJsonFile(INSTALLS, _items);
  },

  getInstallMode: () => {
    return readFileJson(OPTIONS, toObject).installMode;
  },

  setInstallMode: (installMode) => {
    let options = readFileJson(OPTIONS, toObject);
    options.installMode = installMode;
    saveJsonFile(OPTIONS, options);
  },

  setRevertVersion: (revertVersion) => {
    let options = readFileJson(OPTIONS, toObject);
    options.revertVersion = revertVersion;
    saveJsonFile(OPTIONS, options);
  },

  getRevertVersion: () => {
    return readFileJson(OPTIONS, toObject).revertVersion;
  },

  save: (items) => {
    if (!_items) {
      _items = readFileJson(INSTALLS, toArray);
    }
    items.filter(item => item.status == 'uninstall').forEach(item => {
      const exists = _items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        _items.splice(_items.indexOf(exists), 1);
      }
    });
    items.filter(item => item.status != 'uninstall').forEach(item => {
      const exists = _items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        if (exists.status != item.status && exists.status == 'install') {
          throw new Error(exists.name + ' v' + exists.version + i18n.t('已经安装'));
        }
        exists.status = item.status;
        exists.installDate = item.installDate;
      } else {
        _items.push(item);
      }
    });
    saveJsonFile(INSTALLS, _items);
  }
}
