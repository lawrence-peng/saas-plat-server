export default class extends saasplat.model.migration {
  async up() {
    await this.queryInterface.addColumn('account', 'QQ', saasplat.model.TYPE.STRING);
  }
}
