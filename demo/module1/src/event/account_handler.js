
export default class extends saasplat.eventhandler {
  accountCreated(message) {
    console.log('account created', ...message);
    return true;
  }

  accountDeleted(message){
    console.log('account deleted', ...message);
    return true;
  }
}
