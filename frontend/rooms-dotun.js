/*
  DotsBar Rooms — rewritten to match backend/socket contracts.
  - Auth: socket.emit('auth', token)
  - Join: socket.emit('join-room', room.id)
  - Chat: socket.emit('chat-message', { roomId, message })
  - Tips: socket.emit('tip', { roomId, amount, creatorId })
  - WebRTC signalling: backend emits/accepts offer/answer/ice-candidate
*/

const socket = io();

let currentRoomId = null;
let currentRoomCreatorId = null;
let localStream = null;
let isMuted = false;

// remoteSocketId -> RTCPeerConnection
const peerConnections = new Map();

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// DOM
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

const localVideoEl = document.getElementById('local-video');
const remoteVideosEl = document.getElementById('remote-videos');

// Auth check
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !user) {
  window.location.href = 'index.html';
}

if (userInfoDiv) {
  userInfoDiv.innerHTML = `<span>Welcome, ${user.username}</span> <button id="logout">Logout</button>`;
  document.getElementById('logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}

async function loadRooms() {
  const res = await fetch('/api/rooms');
  const data = await res.json();

  if (!roomsContainer) return;
  roomsContainer.innerHTML = '';

  (data.rooms || []).forEach((room) => {
    const roomEl = document.createElement('div');
    roomEl.className = 'room-card';
    roomEl.innerHTML = `
      <h3>${room.name}</h3>
      <p>${room.description || ''}</p>
      <p>By: ${room.creator}</p>
      <p>Viewers: ${room.viewerCount ?? 0}</p>
      <button data-room-id="${room.id}" data-creator-id="${room.creatorId}">Enter Room</button>
    `;
    roomEl.querySelector('button')?.addEventListener('click', () => enterRoom(room.id, room.creatorId));
    roomsContainer.appendChild(roomEl);
  });
}

function enterRoom(roomId, creatorId) {
  currentRoomId = roomId;
  currentRoomCreatorId = creatorId;

  const currentRoomNameEl = document.getElementById('current-room-name');
  if (currentRoomNameEl) currentRoomNameEl.textContent = currentRoomId;

  if (roomsList) roomsList.style.display = 'none';
  if (createRoomSection) createRoomSection.style.display = 'none';
  if (roomView) roomView.style.display = 'block';
}

// Create room
createRoomForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('room-name')?.value;
  const description = document.getElementById('room-description')?.value;

  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name, description })
  });

  if (res.ok) {
    await loadRooms();
    createRoomForm.reset();
  } else {
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'Failed to create room');
  }
});

// Join room
joinButton?.addEventListener('click', async () => {
  if (!currentRoomId) return alert('Pick a room first');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    if (localVideoEl) {
      localVideoEl.srcObject = localStream;
      localVideoEl.muted = true;
    }

    // default muted = false
    isMuted = false;
    if (muteButton) {
      muteButton.disabled = false;
      muteButton.textContent = 'Mute';
      muteButton.disabled = false;
    }

    socket.emit('join-room', currentRoomId);

    if (joinButton) joinButton.disabled = true;
    if (leaveButton) leaveButton.disabled = false;

    if (messagesDiv) messagesDiv.innerHTML = '';
  } catch (error) {
    alert('Could not access camera/microphone');
  }
});

// Mute toggle
muteButton?.addEventListener('click', () => {
  if (!localStream) return;
  const audioTracks = localStream.getAudioTracks();
  audioTracks.forEach((track) => (track.enabled = isMuted));
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
});

// Leave room
leaveButton?.addEventListener('click', () => {
  if (!currentRoomId) return;

  socket.emit('leave-room', currentRoomId);

  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  if (remoteVideosEl) remoteVideosEl.innerHTML = '';

  isMuted = false;
  if (joinButton) joinButton.disabled = false;
  if (muteButton) muteButton.disabled = true;
  if (leaveButton) leaveButton.disabled = true;

  if (roomView) roomView.style.display = 'none';
  if (roomsList) roomsList.style.display = 'block';
  currentRoomId = null;
  currentRoomCreatorId = null;
});

// Chat
sendButton?.addEventListener('click', () => {
  if (!currentRoomId) return;
  const message = (messageInput?.value || '').trim();
  if (!message) return;

  socket.emit('chat-message', { roomId: currentRoomId, message });
  if (messageInput) messageInput.value = '';
});

messageInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendButton?.click();
});

// Tip
tipButton?.addEventListener('click', () => {
  if (!currentRoomId || !currentRoomCreatorId) return;

  const amountStr = prompt('Enter tip amount:');
  if (!amountStr) return;
  const amount = parseFloat(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) return;

  socket.emit('tip', {
    roomId: currentRoomId,
    amount,
    creatorId: currentRoomCreatorId
  });
});

// Socket.io
socket.on('connect', () => {
  socket.emit('auth', token);
});

socket.on('auth-ok', () => {
  console.log('Socket auth ok');
});

socket.on('auth-error', (msg) => {
  alert(msg || 'Socket auth failed');
});

socket.on('viewer-count', ({ count }) => {
  // optional: you can render count in UI
});

socket.on('user-joined', ({ socketId }) => {
  if (!currentRoomId || !localStream) return;
  if (peerConnections.has(socketId)) return;
  createPeerConnection(socketId, true);
});

socket.on('user-left', ({ socketId }) => {
  if (peerConnections.has(socketId)) {
    peerConnections.get(socketId)?.close();
    peerConnections.delete(socketId);
  }
  // optional: remove remote video element
});

// WebRTC signalling
socket.on('offer', async ({ offer, from }) => {
  if (!localStream) return;
  createPeerConnection(from, false);

  const pc = peerConnections.get(from);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('answer', { roomId: currentRoomId, answer });
});

socket.on('answer', async ({ answer, from }) => {
  const pc = peerConnections.get(from);
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ candidate, from }) => {
  const pc = peerConnections.get(from);
  if (!pc) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {
    // ignore
  }
});

// Chat
socket.on('chat-message', (msg) => {
  if (!messagesDiv) return;
  const msgEl = document.createElement('div');
  msgEl.textContent = `${msg.username}: ${msg.message}`;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Tips
socket.on('tip-sent', ({ newBalance }) => {
  // also update localStorage user.balance to keep coins UI consistent
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u) {
      u.balance = newBalance;
      localStorage.setItem('user', JSON.stringify(u));
    }
  } catch {}

  localStorage.setItem('token', localStorage.getItem('token') || token);
});

socket.on('tip-received', ({ from, amount }) => {
  if (typeof showGlobalToast === 'function') {
    showGlobalToast(`💸 ${from} tipped you ${amount}!`, 'success');
  }
});

socket.on('error', (msg) => {
  if (typeof showGlobalToast === 'function') showGlobalToast(msg, 'error');
  else alert(msg);
});

function createPeerConnection(remoteSocketId, isInitiator) {
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(remoteSocketId, pc);

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate && currentRoomId) {
      socket.emit('ice-candidate', {
        roomId: currentRoomId,
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    // create one video per remote socket
    if (!remoteVideosEl) return;

    let videoEl = remoteVideosEl.querySelector(`video[data-remote='${remoteSocketId}']`);
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.dataset.remote = remoteSocketId;
      remoteVideosEl.appendChild(videoEl);
    }
    videoEl.srcObject = event.streams[0];
  };

  if (isInitiator && currentRoomId) {
    pc.createOffer().then(async (offer) => {
      await pc.setLocalDescription(offer);
      socket.emit('offer', { roomId: currentRoomId, offer });
    });
  }

  return pc;
}

// show creator controls
if (user?.isCreator && createRoomSection) {
  createRoomSection.style.display = 'block';
}

// initial state
if (muteButton) muteButton.disabled = true;
if (leaveButton) leaveButton.disabled = true;

loadRooms();

