// 用户服务
import { data as db } from './orm';

let User;
let Role;
let UserRole;

const createTable = async(force) => {
  User = db.sysdb.define({
    id: db.sysdb.STRING(255),
    name: db.sysdb.STRING(255),
    displayName: db.sysdb.STRING(255),
    password: db.sysdb.STRING(255),
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    },
    description: db.sysdb.STRING(2048)
  });

  Role = db.sysdb.define({
    name: db.sysdb.STRING(255),
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    },
    description: db.sysdb.STRING(2048)
  });

  UserRole = db.sysdb.define({});

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

  await UserRole.sync({ force });
  await User.sync({ force });
  await Role.sync({ force });
}

const init = async(force = false) => {
  await createTable(force);
}

export default {
  init
}
