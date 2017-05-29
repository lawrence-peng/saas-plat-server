export default class extends saasplat.model.migration {
  async up() {
    await this.addColumn('account', 'QQ', saasplat.model.TYPE.STRING);
  }
}
