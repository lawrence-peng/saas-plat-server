export default saasplat.model.define.define('account', {
  name: TYPE.STRING(255),
  displayName: TYPE.STRING(255),
  email: TYPE.STRING(255),
  contactPhone: TYPE.STRING(255),
  contactAddress: TYPE.STRING(255),
  role: TYPE.ENUM('user', 'admin'),
  disableAt: TYPE.DATE
}, {
  tableName: 'module1_accountlist'
});
