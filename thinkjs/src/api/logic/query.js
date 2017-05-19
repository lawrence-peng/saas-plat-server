export default class extends think.logic.base {

  getAction() {
    this.rules = {
      name: {
        required: true,
        regexp: /^[a-zA-Z0-9_/]*$/
      },
      module: "string|ascii",
      attributes: "field",
      where: "string",
      id: "string",
      offset: "int:0|default:0",
      limit: "int:1,1000|default:10",
      version: "string|in:1.0|default:1.0",
      count: "boolean|default:false"
    }
  }
}
