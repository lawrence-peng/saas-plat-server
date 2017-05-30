
export default class handler2 extends saasplat.eventhandler {
  @event('module1')
  async accountCreated({
    contactPhone,
    userName,
    password,
    displayName,
    email,
    isAdmin
  }) {
    await this.model('other_account').create({
      name: userName
    });

    console.log('other_account created');
  }


}
