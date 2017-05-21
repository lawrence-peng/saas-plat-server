export default class extends saasplat.eventhandler {
  async accountCreated({
    contactPhone,
    userName,
    password,
    displayName,
    email,
    isAdmin
  }) {
    await this.get('account').create({
      name: userName,
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
    const account = await this.get('account').findOne({
      where: {
        name: userName
      }
    });
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
