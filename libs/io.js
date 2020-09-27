import _ from 'lodash'
import socketio from 'socket.io'
const SocketPoll = {}

// 删除
function removeSocket (socket) {
  if (SocketPoll[socket.id]) {
    delete SocketPoll[socket.id][socket.uuid]
    if (_.isEmpty(SocketPoll[socket.id])) {
      delete SocketPoll[socket.id]
    }
  }
}
// 设置
function setSocket (uuid, user, socket) {
  socket.id = user.id
  socket.name = user.uname
  socket.uuid = uuid
  if (!SocketPoll[socket.id]) {
    SocketPoll[socket.id] = {}
  }
  SocketPoll[socket.id][uuid] = socket
}
// 获取
export function getSocket (u) {
  if (_.isString(u)) {
    return SocketPoll[u]
  } else if (_.isObject(u)) {
    return SocketPoll[u.id]
  }
}
export function start (server) {
  const io = socketio(server)
  io.on('connection', function (socket) {
    socket.on('login', function (user) {
      setSocket(socket.id, user, socket) // 存储
      socket.broadcast.emit('online', socket.name)
    })
    socket.on('disconnect', function () {
      if (!getSocket(socket.id)) return
      socket.broadcast.emit('offline', socket.name)
      removeSocket(socket)
    })
    socket.on('sendMSG', function (msg) {
      const sockets = getSocket(socket.id)
      if (sockets && !_.isEmpty(sockets)) {
        _.each(sockets, function (st) {
          st.broadcast.emit('receiveMSG', msg)
        })
      }
    })
  })
}

export function sendFeed (uid, data) {
  const sockets = getSocket(uid)
  if (sockets && !_.isEmpty(sockets)) {
    _.each(sockets, function (socket) {
      socket.emit('receiveFeed', data)
    })
    return true
  }
  return false
}

export default {
  start,
  getSocket,
  sendFeed
}
