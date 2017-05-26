export default class extends saasplat.eventhandler {
  async accountCreated({
    userName,
    contactPhone,
    password,
    displayName,
    email,
    isAdmin
  }) {
    await this.model('account').create({
      id: userName,
      displayName,
      email,
      contactPhone,
      contactAddress: '',
      role: isAdmin ? 'admin' : 'user'
    });

    console.log('account created');
  }

  async accountUpdated({
    userName,
    address,
    email
  }) {
    const account = await this.model('account').findById(userName);
    if (!account) {
      return;
    }

    if (address !== undefined) {
      account.address = address;
    }
    if (email !== undefined) {
      account.email = email;
    }

    await account.save();

    console.log('account updated');
  }
}
