export default class extends think.controller.base {

  async postAction() {
    const {
      name,
      module,
      ...data
    } = this.post();
    await saasplat.command.publish([{
      name,
      module,
      ...data
    }]);
    return this.success();
  }
}
