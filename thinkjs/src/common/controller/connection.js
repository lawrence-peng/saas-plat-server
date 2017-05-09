
export default class extends think.controller.rest {

  async getAction() {
    return this.success({
      date: (new Date()).getTime()
    });
  }
}
