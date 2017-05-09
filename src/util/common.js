import fs from 'fs';
import path from 'path';

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
    result = result.concat(getFiles(dir + path.sep + subdir + path.sep + finddir,
      subdir + path.sep + finddir + path.sep, filter));
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
