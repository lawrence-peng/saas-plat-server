export default class extends saasplat.commandhandler {
  async createAccount(message) {
    await this.repository.use(async() => {
      const userAccount = this.getAggregate('user').create(message);
      await this.repository.save(userAccount);
      await this.repository.commit();
    });
  }

  async deleteAccount({id}) {
    await this.repository.use(async() => {
      const userAccount = await this.getRepository('user').get(id);
      userAccount.delete();
      await this.repository.commit();
    });
  }

  async updateAddress({id, address}) {
    await this.repository.use(async() => {
      const userAccount = await this.getRepository('user').get(id);
      userAccount.updateAddress();
      await this.repository.commit();
    });
  }
}
