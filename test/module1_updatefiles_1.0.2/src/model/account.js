export default class extends saasplat.model.base {
  schame() {
    return {
      id: {
        primaryKey: true,
        type: TYPE.STRING(255),
        unique: true
      },
      displayName: TYPE.STRING(255),
      email: TYPE.STRING(255),
      contactPhone: TYPE.STRING(255),
      contactAddress: TYPE.STRING(255),
      QQ: TYPE.STRING(20),
      role: TYPE.ENUM('user', 'admin'),
      disableAt: TYPE.DATE
    };
  }
}
