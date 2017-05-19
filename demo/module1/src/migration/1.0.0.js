export default class extends saasplat.magration {
  up() {
    this.queryInterface.createTable('account', {
      id: {
        type: TYPE.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      createdAt: {
        type: TYPE.DATE
      },
      updatedAt: {
        type: TYPE.DATE
      },
      name: {
        type: TYPE.STRING(255),
        unique: true
      },
      displayName: TYPE.STRING(255),
      email: TYPE.STRING(255),
      contactPhone: TYPE.STRING(255),
      contactAddress: TYPE.STRING(255),
      role: TYPE.ENUM('user', 'admin'),
      disableAt: TYPE.DATE
    }, {
      //engine: 'MYISAM', // default: 'InnoDB'
    //  charset: 'utf8' // default: null
      //schema: 'public' // default: public, PostgreSQL only.
    })
  }

  down() {
    this.queryInterface.dropTable('account')
  }
}
