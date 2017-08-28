export default class extends saasplat.system.migration {
  async up() {
    // add config3: TYPE.DATE, config4: TYPE.DATE, config5: TYPE.DATE
    const table = await this.describeTable('config');
    if (!table.config3) {
      await this.addColumn('config', 'config3', TYPE.STRING);
    }
    if (!table.config4) {
      await this.addColumn('config', 'config4', TYPE.STRING);
    }
    if (!table.config5) {
      await this.addColumn('config', 'config5', TYPE.STRING);
    }
  }
  async down() {
    const table = await this.describeTable('config');
    if (table.config3) {
      await this.removeColumn('config', 'config3');
    }
    if (table.config4) {
      await this.removeColumn('config', 'config4');
    }
    if (table.config5) {
      await this.removeColumn('config', 'config5');
    }
  }
}
