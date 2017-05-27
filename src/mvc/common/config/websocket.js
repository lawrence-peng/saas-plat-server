export default {
  on: true, //是否开启 WebSocket
  type: 'socket.io', //使用的 WebSocket 库类型，默认为 socket.io
  //allow_origin: '', //允许的 origin
  //adp: undefined, // socket 存储的 adapter，socket.io 下使用
  //path: 'socket.io', //url path for websocket
  messages: {
    open: 'api/socketio/open', // WebSocket 建立连接时处理的 Action
    close: 'api/socketio/close', // WebSocket 关闭时处理的 Action
    group: 'api/socketio/addgroup', //addgroup 事件处理的 Action
  }
};
