import { version } from '../../../../package.json';

export default class extends think.controller.base {

  getAction() {
    return this.success({
      version,
      date: (new Date()).getTime()
    });
  }
}
