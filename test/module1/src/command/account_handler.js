export default class extends saasplat.commandhandler {
  async createAccount(message) {
    await this.repository.use(async() => {
      const userAccount = this.getAggregate('user').create(message);
      await this.repository.save(userAccount);
      await this.repository.commit();
    });
  }

  async deleteAccount({userName}) {
    await this.repository.use(async() => {
      const userAccount = await this.getRepository('user').get(userName);
      userAccount.delete();
      await this.repository.save(userAccount);
      await this.repository.commit();
    });
  }

  async updateAddress({userName, address}) {
    await this.repository.use(async() => {
      const userAccount = await this.getRepository('user').get(userName);
      userAccount.updateAddress(address);
      await this.repository.save(userAccount);
      await this.repository.commit();
    });
  }
}
