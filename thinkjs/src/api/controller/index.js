
export default class extends think.controller.base {

  getAction() {
    return this.success({
      version: 'v1',
      date: (new Date()).getTime()
    });
  }
}
