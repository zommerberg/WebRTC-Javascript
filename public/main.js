let localVideo = document.getElementById('localVideo')
let remoteVideo = document.getElementById('remoteVideo')
let localStream
let remoteUser
let rtcPeerConnection

let socket = io()

window.addEventListener('beforeunload', function (e) {
  socket.emit('disconnect')
})

navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then(stream => {
    localVideo.srcObject = stream
    localStream = stream
  })

socket.emit('start call')

socket.on('call partner', partnerID => {
  rtcPeerConnection = createPeerConnection(partnerID)
  localStream
    .getTracks()
    .forEach(track => rtcPeerConnection.addTrack(track, localStream))
  remoteUser = partnerID
})

socket.on('call host', hostID => {
  remoteUser = hostID
})

socket.on('offer', incomingOffer => {
  rtcPeerConnection = createPeerConnection()
  rtcPeerConnection
    .setRemoteDescription(new RTCSessionDescription(incomingOffer.sdp))
    .then(() => {
      localStream
        .getTracks()
        .forEach(track => rtcPeerConnection.addTrack(track, localStream))
    })
    .then(() => {
      return rtcPeerConnection.createAnswer()
    })
    .then(answer => {
      return rtcPeerConnection.setLocalDescription(answer)
    })
    .then(() => {
      const payload = {
        target: incomingOffer.caller,
        caller: socket.id,
        sdp: rtcPeerConnection.localDescription,
      }
      socket.emit('answer', payload)
    })
})

socket.on('answer', payload => {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
})

socket.on('ice-candidate', incomingCandidate => {
  rtcPeerConnection.addIceCandidate(new RTCIceCandidate(incomingCandidate))
})

function createPeerConnection(userID) {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.stunprotocol.org',
      },
    ],
  })

  peerConnection.onnegotiationneeded = () => {
    rtcPeerConnection
      .createOffer()
      .then(offer => {
        return rtcPeerConnection.setLocalDescription(offer)
      })
      .then(() => {
        const payload = {
          target: userID,
          caller: socket.id,
          sdp: rtcPeerConnection.localDescription,
        }
        socket.emit('offer', payload)
      })
      .catch(e => console.log(e))
  }

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      const payload = {
        target: remoteUser,
        candidate: e.candidate,
      }
      socket.emit('ice-candidate', payload)
    }
  }

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0]
  }

  return peerConnection
}
