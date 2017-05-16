/**
 * session configs
 */
export default {
  name: 'sp-server',
  type: 'file',
  secret: 'TPG3Z*QO',
  timeout: 24 * 3600,
  cookie: { // cookie options
    length: 32,
    httponly: true
  },
  adapter: {
    file: {
      path: think.RUNTIME_PATH + '/session',
    }
  }
};
