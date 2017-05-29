import fs from 'fs';
import path from 'path';
import assert from 'assert';
//
export function cmpVer(a, b) {
  assert(a);
  assert(b);
  // 支持1.0.1_xxxx.js
  const v1 = a.split('_')[0].split('.');
  const v2 = b.split('_')[0].split('.');
  for (let i = 0; i < v1.length || i < v2.length; i++) {
    if ((v1[i] || '0') < (v2[i] || '0')) {
      return -1;
    } else if ((v1[i] || '0') > (v2[i] || '0')) {
      return 1;
    }
  }
  return 0;
}

export function lastChild(array) {
  if (!Array.isArray(array)) {
    return array;
  }
  if (array.length <= 0) {
    return null;
  }
  return array[array.length - 1];
}

function getFiles(dir, prefix, filter) {
  dir = path.normalize(dir);
  if (!fs.existsSync(dir)) {
    return [];
  }
  if (typeof prefix != 'string') {
    filter = prefix;
    prefix = '';
  }
  if (filter === true) {
    filter = item => {
      return item[0] !== '.';
    };
  }
  prefix = prefix || '';
  let result = [];
  let files = fs.readdirSync(dir);
  files.forEach(item => {
    let stat = fs.statSync(dir + path.sep + item);
    if (stat.isFile()) {
      if (!filter || filter(item)) {
        result.push(prefix + item);
      }
    } else if (stat.isDirectory()) {
      if (!filter || filter(item, true)) {
        let cFiles = getFiles(dir + path.sep + item, prefix + item + path.sep, filter);
        result = result.concat(cFiles);
      }
    }
  });
  return result;
}

export function findFiles(dir, subdirs, finddir, filter) {
  let result = [];
  subdirs = subdirs || [];
  subdirs.forEach(subdir => {
    result = result.concat(getFiles(dir + path.sep + subdir + path.sep + finddir, subdir + path.sep + finddir + path.sep, filter));
  });
  return result;
}

export function mkdir(p, mode) {
  mode = mode || '0777';
  if (fs.existsSync(p)) {
    fs.chmodSync(p, mode);
    return true;
  }
  let pp = path.dirname(p);
  if (fs.existsSync(pp)) {
    fs.mkdirSync(p, mode);
  } else {
    mkdir(pp, mode);
    mkdir(p, mode);
  }
  return true;
}

export function getClassName(Type) {
  assert(Type);
  if (Type.name != '_class') {
    return Type.name;
  }
  const filename = Type.prototype.__filename;
  if (filename) {
    const sp = filename.split(path.sep);
    const name = sp[sp.length - 1] ;
    const extIndex = name.lastIndexOf('.');
    return name.substr(0, extIndex);
  }
  return Type.name;
}
