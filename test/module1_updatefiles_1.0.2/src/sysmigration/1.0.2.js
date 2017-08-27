export default class extends saasplat.system.migration {
  async up() {
    // add config3: TYPE.DATE, config4: TYPE.DATE, config5: TYPE.DATE
    await this.addColumn('config', 'config3', TYPE.STRING);
    await this.addColumn('config', 'config4', TYPE.STRING);
    await this.addColumn('config', 'config5', TYPE.STRING);
  }
  async down() {
    await this.removeColumn('config', 'config3');
    await this.removeColumn('config', 'config4');
    await this.removeColumn('config', 'config5');
  }
}
