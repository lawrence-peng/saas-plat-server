// 用户权限服务
import Sequelize from 'sequelize';
import i18n from './util/i18n';
import {userroleLogger as logger} from './util/log';
import {db} from './util/sysdb';

let User;
let Role;
let UserRole;
// 功能权限
let Privilege;
// 数据权限
let DataPrivilege;

const createTable = async() => {
  User = db().define('$system_users', {
    id: Sequelize.STRING(255),
    displayName: Sequelize.STRING(255),
    status: {
      type: Sequelize.ENUM('enabled', 'disabled'),
      allowNull: false
    },
    description: Sequelize.STRING(2048)
  });
  Role = db().define('$system_roles', {
    name: Sequelize.STRING(255),
    status: {
      type: Sequelize.ENUM('enabled', 'disabled'),
      allowNull: false
    },
    description: Sequelize.STRING(2048)
  });
  UserRole = db().define('$system_userroles', {});
  User.belongsToMany(Role, {
    as: 'Roles',
    through: UserRole,
    foreignKey: 'userId'
  });
  Role.belongsToMany(User, {
    as: 'Users',
    through: UserRole,
    foreignKey: 'roleId'
  });
  // 功能权限采用Who、What、How的设计
  Privilege = db().define('$system_privileges', {
    master: Sequelize.ENUM('user', 'role'), // who: user or role
    master_value: Sequelize.INTEGER,
    access: Sequelize.STRING(255), // what: module command field
    access_value: Sequelize.STRING(255),
    operation: Sequelize.STRING(255), // how: enabled disabled
    status: {
      type: Sequelize.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });
  DataPrivilege = db().define('$system_dataprivileges', {
    view: Sequelize.STRING(255), // 资源名称
    // 这个过滤规则分为三个部分：【分组】、【规则】(字段、值、操作符)、【操作符】(and or)，而自身就是一个分组。
    rules: Sequelize.STRING(2048), // 数据规则，用json保存用于合并查询条件
    status: {
      type: Sequelize.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });
}

const clear = async() => {
  logger.debug(i18n.t('清空权限设置'));
}

const init = async() => {
  await createTable();
}

export default {
  init,
  clear
}
