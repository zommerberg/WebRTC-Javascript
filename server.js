var express = require('express')
var app = express()

app.use(express.static('public'))

var server = app.listen(3000, () => {
  console.log('listening to port 3000')
})

var io = require('socket.io').listen(server)

let users = []

io.on('connection', socket => {
  socket.on('disconnect', () => {
    users = users.filter(e => e != socket.id)
  })

  socket.on('start call', () => {
    users.push(socket.id)
    if (users.length > 1) {
      let hostID = users[0]
      let partnerID = users[1]
      io.to(hostID).emit('call partner', partnerID)
      io.to(partnerID).emit('call host', hostID)
    }
  })
  socket.on('offer', payload => {
    io.to(payload.target).emit('offer', payload)
  })

  socket.on('answer', payload => {
    io.to(payload.target).emit('answer', payload)
  })

  socket.on('ice-candidate', incoming => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate)
  })
})
