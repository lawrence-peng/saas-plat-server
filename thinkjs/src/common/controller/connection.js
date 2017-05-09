
export default class extends saasplat.controller.rest {

  async getAction() {
    return this.success({
      date: (new Date()).getTime()
    });
  }
}
