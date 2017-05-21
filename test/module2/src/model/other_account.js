export default class extends saasplat.model.base {
  schame() {
    return {
      name: {
        type: TYPE.STRING(255)
      }
    };
  }
}
