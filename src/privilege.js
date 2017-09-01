// 权限服务
import { data as db } from './orm';

let DataPrivilege;
let Privilege;

const createTable = async(force) => {
  DataPrivilege = db.sysdb.define({
    view: db.sysdb.STRING(255), // 资源名称
    // 这个过滤规则分为三个部分：【分组】、【规则】(字段、值、操作符)、【操作符】(and or)，而自身就是一个分组。
    rules: db.sysdb.STRING(2048), // 数据规则，用json保存用于合并查询条件
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });

  Privilege = db.sysdb.define({
    master: db.sysdb.ENUM('user', 'role'), // who: user or role
    master_value: db.sysdb.INTEGER,
    access: db.sysdb.STRING(255), // what: module command field
    access_value: db.sysdb.STRING(255),
    operation: db.sysdb.STRING(255), // how: enabled disabled
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });

  await Privilege.sync({ force });
  await DataPrivilege.sync({ force });
};

const check = async() => {

}

const getPrivilege = async() => {

}

const refresh = async() => {

}

const init = async(force = false) => {
  await createTable(force);
}

export default {
  init,
  refresh,
  check,
  getPrivilege
}
