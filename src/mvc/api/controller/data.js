

export default class extends think.controller.base {
  async insertAction() {
    return this.success(await saasplat.data.insert(this.post()));
  }
  async deleteAction() {
    return this.success(await saasplat.data.delete(this.post('id')));
  }
  async findAction() {
    return this.success(await saasplat.data.find(this.get()));
  }
  async firstAction() {
    return this.success(await saasplat.data.first(this.get()));
  }
  async lastAction() {
    return this.success(await saasplat.data.first(this.get(), { datetime: 0 }));
  }
  async updateAction() {
    const { id, ...data } = this.post();
    return this.success(await saasplat.data.update(data, { id }));
  }
  async countAction() {
    return this.success(await saasplat.data.count(this.get()));
  }
}
