export default class extends think.logic.base {

  postAction() {
    this.rules = {
      name: "string|alphaNumericDash|required",
      module: "string|alphaNumericDash",
      version: "string|in:1.0|default:1.0"
    }
  }
}
