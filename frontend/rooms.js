const API_BASE = window.__DOTSBAR_API_BASE__ || window.location.origin;

// Use global io() provided by socket.io client script
const socket = (window.io ? window.io(API_BASE, { transports: ['websocket', 'polling'] }) : null);

let currentRoomId = null;
let currentRoomCreatorId = null;
let localStream;
let peerConnections = new Map();
let isJoined = false;
let isMuted = false;


const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// DOM elements
const roomsContainer = document.getElementById('rooms-container');
const createRoomForm = document.getElementById('create-room-form');
const roomView = document.getElementById('room-view');
const roomsList = document.getElementById('rooms-list');
const createRoomSection = document.getElementById('create-room');
const joinButton = document.getElementById('join-room');
const muteButton = document.getElementById('mute-toggle');
const leaveButton = document.getElementById('leave-room');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message');
const messagesDiv = document.getElementById('messages');
const tipButton = document.getElementById('tip-button');
const userInfoDiv = document.getElementById('user-info');

const currentRoomNameEl = document.getElementById('current-room-name');

// WebRTC config
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function requireAuth() {
  if (!token || !user) {
    window.location.href = 'index.html';
    return false;
  }
  if (userInfoDiv) {
    userInfoDiv.innerHTML = `<span>Welcome, ${user.username}</span> <button id="logout">Logout</button>`;
    document.getElementById('logout')?.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }
  return true;
}

if (!requireAuth()) {
  // stop further init
} else {
  // Show create room if creator
  if (user?.isCreator && createRoomSection) createRoomSection.style.display = 'block';

  // Initial UI state
  if (muteButton) muteButton.disabled = true;
  if (leaveButton) leaveButton.disabled = true;

  // Load rooms
  (async function loadRooms() {
    try {
      const res = await fetch(`${API_BASE}/api/rooms`);
      const payload = await res.json();
      const rooms = payload.rooms || payload || [];

      roomsContainer.innerHTML = '';
      rooms.forEach((room) => {
        const roomEl = document.createElement('div');
        roomEl.className = 'room-card';
        roomEl.dataset.roomId = room.id;
        roomEl.dataset.creatorId = room.creatorId || '';
        roomEl.innerHTML = `
          <h3>${room.name}</h3>
          <p>${room.description || ''}</p>
          <p>By: ${room.creator || 'Unknown'}</p>
          <button type="button" onclick="window.enterRoom('${room.id}')">Enter Room</button>
        `;
        roomsContainer.appendChild(roomEl);
      });

    } catch (e) {
      console.error('Failed to load rooms', e);
      roomsContainer.innerHTML = '<div style="color:var(--text-muted);">Failed to load rooms.</div>';
    }
  })();

  // Create room
  createRoomForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('room-name').value;
    const description = document.getElementById('room-description').value;

    const res = await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    });

    if (res.ok) {
      // reload
      const r = await res.json().catch(() => ({}));
      // simplest reload
      window.location.reload();
      return r;
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Failed to create room');
    }
  });

  // Enter room (expects room.id)
  window.enterRoom = function enterRoom(roomId) {
    currentRoomId = roomId;

    // best-effort creatorId lookup from the most recently loaded rooms list
    const roomEl = roomsContainer?.querySelector(`[data-room-id="${roomId}"]`);
    currentRoomCreatorId = roomEl?.dataset?.creatorId || null;

    if (currentRoomNameEl) currentRoomNameEl.textContent = roomId;
    roomsList.style.display = 'none';
    createRoomSection.style.display = 'none';
    roomView.style.display = 'block';

    // reset messages UI
    if (messagesDiv) messagesDiv.innerHTML = '';
  };


  // Join room
  joinButton?.addEventListener('click', async () => {
    if (!currentRoomId) {
      alert('Pick a room first.');
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const localVideo = document.getElementById('local-video');
      if (localVideo) localVideo.srcObject = localStream;

      if (!socket) throw new Error('Socket not initialized');

      socket.emit('join-room', currentRoomId);
      isJoined = true;

      joinButton.disabled = true;
      muteButton.disabled = false;
      leaveButton.disabled = false;

      // initialize peer map
      peerConnections = new Map();
    } catch (error) {
      console.error(error);
      alert('Could not access camera/microphone');
    }
  });

  // Mute toggle
  muteButton?.addEventListener('click', () => {
    if (!localStream) return;
    const tracks = localStream.getAudioTracks();
    if (!tracks || !tracks[0]) return;

    tracks[0].enabled = !isMuted;
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  });

  // Leave room
  leaveButton?.addEventListener('click', () => {
    if (!isJoined) return;

    if (socket) socket.emit('leave-room', currentRoomId);

    // close peers
    peerConnections.forEach((pc) => {
      try { pc.close(); } catch {}
    });
    peerConnections.clear();

    // stop media
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    isJoined = false;
    currentRoomId = null;

    joinButton.disabled = false;
    muteButton.disabled = true;
    leaveButton.disabled = true;

    roomView.style.display = 'none';
    roomsList.style.display = 'block';
  });

  // Chat
  sendButton?.addEventListener('click', () => {
    const message = messageInput?.value?.trim();
    if (!message) return;
    if (!socket || !currentRoomId) return;

    socket.emit('chat-message', { roomId: currentRoomId, message });
    if (messageInput) messageInput.value = '';
  });

  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton?.click();
  });

  // Tip creator
  tipButton?.addEventListener('click', () => {
    const amountRaw = prompt('Enter tip amount:');
    if (!amountRaw) return;

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid tip amount.');
      return;
    }

    if (!socket || !currentRoomId) return;

    if (!currentRoomCreatorId) {
      alert('Tip creator not found for this room. Try reloading the page.');
      return;
    }

    socket.emit('tip', { roomId: currentRoomId, amount, creatorId: currentRoomCreatorId });
  });


  // Socket events + WebRTC signaling
  if (socket) {
    socket.on('connect', () => {
      const t = token;
      if (t) socket.emit('auth', t);
    });

    socket.on('viewer-count', ({ roomId, count }) => {
      // optional: show count
      // console.log('viewer-count', roomId, count);
    });

    socket.on('user-joined', (socketId) => {
      // Initiator creates offer
      if (!isJoined) return;
      const pc = createPeerConnection(socketId, true);
      // createPeerConnection will create offer automatically when initiator
    });

    socket.on('user-left', (socketId) => {
      const pc = peerConnections.get(socketId);
      if (pc) {
        try { pc.close(); } catch {}
        peerConnections.delete(socketId);
      }
    });

    socket.on('offer', async (data) => {
      // Received offer from remote peer
      if (!isJoined) return;
      const from = data.from;
      const pc = createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { answer, roomId: currentRoomId, to: from });
    });

    socket.on('answer', async (data) => {
      const from = data.from;
      const pc = peerConnections.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on('ice-candidate', async (data) => {
      const from = data.from;
      const pc = peerConnections.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        // ignore
      }
    });

    socket.on('chat-message', (msg) => {
      if (!messagesDiv) return;
      const msgEl = document.createElement('div');
      msgEl.textContent = `${msg.username}: ${msg.message}`;
      messagesDiv.appendChild(msgEl);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('tip-received', ({ from, amount }) => {
      alert(`Received tip of ${amount} from ${from}`);
    });
  }
}

function createPeerConnection(peerSocketId, isInitiator) {
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerSocketId, pc);

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate || !socket) return;
    socket.emit('ice-candidate', { candidate: event.candidate, roomId: currentRoomId });
  };

  pc.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    document.getElementById('remote-videos')?.appendChild(remoteVideo);
  };

  if (isInitiator && socket) {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer).then(() => offer))
      .then((offer) => {
        socket.emit('offer', { offer, roomId: currentRoomId });
      })
      .catch((e) => console.error('offer failed', e));
  }

  return pc;
}

