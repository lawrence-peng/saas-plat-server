
export default class extends think.controller.rest {

  getAction() {
    return this.success({
      date: (new Date()).getTime()
    });
  }
}
