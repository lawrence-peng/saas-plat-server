/*
  数据存储服务
*/

import { MongoClient } from 'mongodb';

const COLLECTION = 'data';
let options;
let hasChecked = false;

const init = (cfg) => {
  options = { url: 'mongodb://localhost:27017/saas-plat-server', ...cfg };
}

const connect = async() => {
  const { url, ...other } = options;
  const db = await MongoClient.connect(url, other);
  if (!hasChecked) {
    const collections = await db.collections();
    if (collections.indexOf(COLLECTION) == -1) {
      const collection = await db.createCollection(COLLECTION);
      // 按照单据编号和日期排序
      collection.createIndex({ id: 1, datetime: 1 });
    }
    hasChecked = true;
  }
  return db;
}

const _getQuery = (spec) => {
  const {
    id,
    ...other
  } = spec || {};
  if (id !== undefined) {
    return {
      _id: id,
      ...other
    };
  } else {
    return other;
  }
}

const count = async(spec) => {
  const db = await connect();
  const ret = await db.collection(COLLECTION).count(spec);
  return ret;
}

const insert = async(...data) => {
  if (data.length <= 0) {
    return;
  }
  const db = await connect();
  try {
    await db.collection(COLLECTION).insertMany(data.map(({
      id,
      ...other
    }) => ({
      _id: id,
      ...other
    })));
  } finally {
    db.close();
  }
}

const update = async(spec, data) => {
  if (!data) {
    return;
  }
  const db = await connect();
  try {
    await db.collection(COLLECTION).updateOne(_getQuery(spec), data);
  } finally {
    db.close();
  }
}

const first = async(spec, sort = { datetime: 1 }) => {
  const db = await connect();
  try {
    const ret = await db.collection(COLLECTION).find(_getQuery(spec)).sort(sort).toArray();
    if (!ret || ret.length<=0) {
      return null;
    }
    const {
      _id,
      ...other
    } = ret[0];
    return {
      id: _id,
      ...other
    };
  } finally {
    db.close();
  }
}

const find = async(spec, sort = { datetime: 1 }) => {
  const db = await connect();
  try {
    // 由小到大排序
    return (await db.collection(COLLECTION).find(_getQuery(spec)).sort(
      sort).toArray()).map(({
      _id,
      ...other
    }) => ({
      id: _id,
      ...other
    }));
  } finally {
    db.close();
  }
}

const deleteOne = async(spec, options) => {
  const db = await connect();
  try {
    await db.collection(COLLECTION).deleteMany(_getQuery(spec),
      options);
  } finally {
    db.close();
  }
}

const drop = async() => {
  const db = await connect();
  try {
    await db.dropCollection(COLLECTION);
  } finally {
    db.close();
  }
}

export default {
  init,
  connect,
  insert,
  delete:deleteOne,
  find,
  first,
  update,
  count,
  drop
}
