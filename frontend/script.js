// ╔══════════════════════════════════════════════════╗
// ║        DotsBar Core Script — v3.0               ║
// ║  Shared helpers: auth, coins, XP, notifications ║
// ╚══════════════════════════════════════════════════╝

// ── Configuration ─────────────────────────────────
const API_BASE = window.__DOTSBAR_API_BASE__ || window.location.origin;

const CONFIG = {
  smoothScroll: true,
  serverUrl: API_BASE
};


// ── Auth Helpers ──────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function getToken() {
  return localStorage.getItem('token') || null;
}

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('cart');
  window.location.href = 'index.html';
}

// ── Login Redirect Memory ─────────────────────────
function saveLoginRedirect() {
  const page = window.location.pathname.split('/').pop();
  if (page && page !== 'index.html') {
    localStorage.setItem('dotsbar_login_redirect', window.location.href);
  }
}

function consumeLoginRedirect() {
  const url = localStorage.getItem('dotsbar_login_redirect');
  localStorage.removeItem('dotsbar_login_redirect');
  return url || 'bar.html';
}

// ── DotsCoins Helpers ─────────────────────────────
function getCoins() {
  const u = getUser();
  return u ? (u.balance || 0) : 0;
}

function setCoins(amount) {
  const u = getUser();
  if (!u) return false;
  u.balance = Math.max(0, amount);
  localStorage.setItem('user', JSON.stringify(u));
  refreshNavCoins();
  return true;
}

function spendCoins(amount) {
  const current = getCoins();
  if (current < amount) return false;
  setCoins(current - amount);
  return true;
}

function addCoins(amount) {
  setCoins(getCoins() + amount);
}

function refreshNavCoins() {
  const el = document.getElementById('nav-coins-amount');
  if (el) {
    const next = getCoins();
    el.textContent = next.toLocaleString();
    el.classList.remove('coins-pop');
    void el.offsetWidth;
    el.classList.add('coins-pop');
  }
  // Also update dd coins val
  const dd = document.getElementById('nav-dd-coins-val');
  if (dd) dd.textContent = getCoins().toLocaleString();
}

// ── XP & Level System ─────────────────────────────
const XP_PER_ACTION = {
  chat: 5,
  tip: 20,
  order: 10,
  rsvp: 15,
  stream: 8,
  gift: 12
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];

function getXP() {
  return parseInt(localStorage.getItem('dotsbar_xp') || '0');
}

function setXP(val) {
  localStorage.setItem('dotsbar_xp', String(Math.max(0, val)));
}

function getLevel() {
  const xp = getXP();
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return level;
}

function getXPProgress() {
  const xp = getXP();
  const level = getLevel();
  const currentThresh = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThresh = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = nextThresh > currentThresh
    ? Math.round(((xp - currentThresh) / (nextThresh - currentThresh)) * 100)
    : 100;
  return { xp, level, progress, currentThresh, nextThresh };
}

function addXP(action) {
  const amount = XP_PER_ACTION[action] || 5;
  const prevLevel = getLevel();
  setXP(getXP() + amount);
  const newLevel = getLevel();
  if (newLevel > prevLevel) {
    showGlobalToast(`🎉 Level Up! You're now Level ${newLevel}!`, 'success');
    addNotification(`🎉 You levelled up to Level ${newLevel}!`);
  }
}

// ── Stats Helpers (persistent) ────────────────────
function getStat(key) {
  return parseInt(localStorage.getItem('dotsbar_stat_' + key) || '0');
}

function incStat(key, amount = 1) {
  localStorage.setItem('dotsbar_stat_' + key, String(getStat(key) + amount));
}

// ── Activity Feed Helpers ─────────────────────────
function addActivity(icon, desc) {
  const feed = JSON.parse(localStorage.getItem('dotsbar_activity') || '[]');
  feed.unshift({ icon, desc, time: Date.now() });
  if (feed.length > 20) feed.pop();
  localStorage.setItem('dotsbar_activity', JSON.stringify(feed));
}

function getActivity() {
  return JSON.parse(localStorage.getItem('dotsbar_activity') || '[]');
}

function formatActivityTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Notifications System ──────────────────────────
let _notifications = JSON.parse(localStorage.getItem('dotsbar_notifications') || '[]');
let _unreadCount = 0;

function addNotification(msg, type = 'info') {
  _notifications.unshift({ msg, type, time: Date.now(), read: false });
  if (_notifications.length > 30) _notifications.pop();
  _unreadCount = _notifications.filter(n => !n.read).length;
  localStorage.setItem('dotsbar_notifications', JSON.stringify(_notifications));
  _renderNotificationBadge();
  _renderNotificationList();
}

function markAllRead() {
  _notifications.forEach(n => n.read = true);
  _unreadCount = 0;
  localStorage.setItem('dotsbar_notifications', JSON.stringify(_notifications));
  _renderNotificationBadge();
  _renderNotificationList();
}

function _renderNotificationBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = _unreadCount > 9 ? '9+' : _unreadCount;
  badge.style.display = _unreadCount > 0 ? 'flex' : 'none';
}

function _renderNotificationList() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (_notifications.length === 0) {
    list.innerHTML = '<div class="notif-empty">No notifications yet 🍺</div>';
    return;
  }
  list.innerHTML = _notifications.slice(0, 10).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${formatActivityTime(n.time)}</div>
    </div>
  `).join('');
}

function _initNotifications() {
  _unreadCount = _notifications.filter(n => !n.read).length;
  _renderNotificationBadge();
  _renderNotificationList();
}

// ── Nav Profile Pill ──────────────────────────────
function initNavAuth() {
  const user = getUser();

  const loginBtn = document.getElementById('open-login') ||
                   document.getElementById('nav-auth-btn') ||
                   document.getElementById('nav-user-btn');

  const registerBtn = document.getElementById('open-register');

  if (user) {
    if (loginBtn) {
      loginBtn.outerHTML = `
        <div class="nav-profile-pill" id="nav-profile-pill">
          <div class="nav-avatar">${user.username[0].toUpperCase()}</div>
          <span class="nav-username">${user.username}</span>
          <span class="nav-coins-badge" id="nav-coins-amount">${(user.balance || 0).toLocaleString()}</span>
          <span style="font-size:0.7rem;color:var(--text-muted);">🪙</span>
          <div class="nav-profile-dropdown" id="nav-profile-dropdown">
            <div class="nav-dd-header">
              <div style="font-weight:700;">${user.username}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${user.email || ''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">⭐ Level ${getLevel()} · ${getXP()} XP</div>
            </div>
            <a href="profile.html" class="nav-dd-item">👤 My Profile</a>
            <a href="marketplace.html" class="nav-dd-item">🛒 Bar Menu</a>
            <a href="stream.html" class="nav-dd-item">🎥 My Stream</a>
            <a href="leaderboard.html" class="nav-dd-item">🏆 Leaderboard</a>
            <div class="nav-dd-divider"></div>
            <div class="nav-dd-coins">
              <span>🪙 DotsCoins</span>
              <strong id="nav-dd-coins-val">${(user.balance || 0).toLocaleString()}</strong>
            </div>
            <div class="nav-dd-divider"></div>
            <button class="nav-dd-item nav-dd-logout" onclick="logoutUser()">🚪 Log Out</button>
          </div>
        </div>`;

      setTimeout(() => {
        const pill = document.getElementById('nav-profile-pill');
        const dd = document.getElementById('nav-profile-dropdown');
        if (pill && dd) {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
          });
          document.addEventListener('click', () => dd.classList.remove('open'));
        }
      }, 0);
    }

    if (registerBtn) registerBtn.style.display = 'none';

  } else {
    // Save redirect so after login we come back here
    saveLoginRedirect();

    if (loginBtn && !loginBtn.dataset.authBound) {
      loginBtn.dataset.authBound = '1';
      loginBtn.addEventListener('click', () => {
        const modal = document.getElementById('auth-modal');
        if (modal) { switchTab && switchTab('login'); modal.classList.add('open'); }
        else window.location.href = 'index.html';
      });
    }
  }

  // Inject notification bell after nav-actions
  _injectNotifBell();
}

function _injectNotifBell() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.getElementById('notif-bell')) return;

  const bell = document.createElement('div');
  bell.id = 'notif-bell';
  bell.className = 'notif-bell';
  bell.innerHTML = `
    🔔
    <span class="notif-badge" id="notif-badge" style="display:none;">0</span>
    <div class="notif-dropdown" id="notif-dropdown">
      <div class="notif-header">
        <span>Notifications</span>
        <button onclick="markAllRead()" class="notif-clear-btn">Mark all read</button>
      </div>
      <div id="notif-list"></div>
    </div>
  `;
  navActions.insertBefore(bell, navActions.firstChild);

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    dd.classList.toggle('open');
    markAllRead();
  });
  document.addEventListener('click', () => {
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.classList.remove('open');
  });

  _initNotifications();
}

// ── Global Styles Injection ────────────────────────
(function injectNavStyles() {
  if (document.getElementById('dotsbar-nav-styles')) return;
  const s = document.createElement('style');
  s.id = 'dotsbar-nav-styles';
  s.textContent = `
    .nav-profile-pill {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25);
      border-radius: 24px;
      padding: 5px 12px 5px 5px;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .nav-profile-pill:hover { border-color: var(--amber); background: rgba(245,158,11,0.14); }
    .nav-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, var(--amber), #d97706);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 800; color: #000; flex-shrink: 0;
    }
    .nav-username { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .nav-coins-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem; font-weight: 700;
      color: var(--amber);
      transition: transform 0.2s;
    }
    @keyframes coins-pop-anim { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
    .coins-pop { animation: coins-pop-anim 0.3s ease; }

    .nav-profile-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 220px;
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 9999;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.18s, transform 0.18s;
    }
    .nav-profile-dropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .nav-dd-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--glass-border); }
    .nav-dd-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer; text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }
    .nav-dd-item:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .nav-dd-logout { color: var(--crimson) !important; width: 100%; border: none; background: none; font-size: 0.875rem; }
    .nav-dd-logout:hover { background: rgba(220,38,38,0.1) !important; }
    .nav-dd-divider { height: 1px; background: var(--glass-border); margin: 4px 0; }
    .nav-dd-coins {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 16px; font-size: 0.82rem; color: var(--text-muted);
    }
    .nav-dd-coins strong { color: var(--amber); font-family: 'Outfit', sans-serif; }

    /* Notification Bell */
    .notif-bell {
      position: relative;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      transition: var(--transition);
      flex-shrink: 0;
    }
    .notif-bell:hover { border-color: var(--amber); background: rgba(245,158,11,0.08); }
    .notif-badge {
      position: absolute;
      top: -4px; right: -4px;
      width: 18px; height: 18px;
      background: var(--crimson);
      border-radius: 50%;
      font-size: 0.6rem;
      font-weight: 800;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--bg-deep);
    }
    .notif-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: -100px;
      width: 300px;
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 9999;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.18s, transform 0.18s;
    }
    .notif-dropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .notif-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--glass-border);
      font-size: 0.9rem; font-weight: 700;
    }
    .notif-clear-btn {
      background: none; border: none; cursor: pointer;
      font-size: 0.72rem; color: var(--text-muted);
      transition: color 0.2s;
    }
    .notif-clear-btn:hover { color: var(--amber); }
    .notif-item {
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
      transition: background 0.15s;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item.unread { background: rgba(245,158,11,0.04); }
    .notif-item:hover { background: rgba(255,255,255,0.03); }
    .notif-msg { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; }
    .notif-time { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; }
    .notif-empty { text-align: center; padding: 24px 16px; font-size: 0.85rem; color: var(--text-muted); }
  `;
  document.head.appendChild(s);
})();

// ── Smooth Scrolling ──────────────────────────────
function setupSmoothScroll() {
  if (!CONFIG.smoothScroll) return;
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    });
  });
}

// ── FAQ Accordion ─────────────────────────────────
function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isOpen = content.style.display === 'block';
      document.querySelectorAll('.accordion-content').forEach(c => { c.style.display = 'none'; });
      content.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('active', !isOpen);
    });
  });
}

// ── Scroll Animations ─────────────────────────────
function setupScrollAnimations() {
  if (!window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.feature-card, .step, .testimonial, .pillar').forEach(el => {
    el.classList.add('animate-out');
    observer.observe(el);
  });
}

// ── Socket.io Global Connection ───────────────────
let _socket = null;

function getSocket() {
  return _socket;
}

function initSocket(onReady) {
  if (window.io) {
    _connectSocket(onReady);
    return;
  }
  const script = document.createElement('script');
  script.src = '/socket.io/socket.io.js';
  script.onload = () => _connectSocket(onReady);
  script.onerror = () => console.warn('Socket.io client could not load — offline mode');
  document.head.appendChild(script);
}

function _connectSocket(onReady) {
  try {
    _socket = io(CONFIG.serverUrl, { transports: ['websocket', 'polling'] });
    _socket.on('connect', () => {
      console.log('🔌 Socket connected:', _socket.id);
      const token = getToken();
      if (token) _socket.emit('auth', token);
      if (onReady) onReady(_socket);
    });
    _socket.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });
    _socket.on('tip-sent', ({ amount, newBalance }) => {
      setCoins(newBalance);
      showGlobalToast(`💸 ${amount} DotsCoins sent!`, 'success');
      addNotification(`💸 You sent a tip of ${amount} DotsCoins`);
      addXP('tip');
      addActivity('💸', `Tipped ${amount} DotsCoins`);
      incStat('tips');
    });
    _socket.on('tip-received', ({ from, amount }) => {
      addNotification(`💸 ${from} tipped you ${amount} DotsCoins!`, 'success');
    });
    _socket.on('new-event', (event) => {
      addNotification(`📅 New event created: "${event.title}" by ${event.host}`);
    });
    _socket.on('gift-received', ({ from, items }) => {
      const names = items.map(i => i.name).join(', ');
      showGlobalToast(`🎁 ${from} sent you: ${names}!`, 'success');
      addNotification(`🎁 ${from} gifted you: ${names}`);
    });
    _socket.on('error', (msg) => {
      showGlobalToast(msg, 'error');
    });
  } catch(e) {
    console.warn('Socket.io init failed:', e);
  }
}

// ── Global Toast ──────────────────────────────────
function showGlobalToast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '🍺';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── Daily Login Reward ───────────────────────────
function dailyLoginReward() {
  const user = getUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastClaim = localStorage.getItem('dotsbar_daily_claim');
  if (lastClaim === today) return;
  localStorage.setItem('dotsbar_daily_claim', today);
  const reward = 50;
  addCoins(reward);
  showGlobalToast(`🎁 Daily reward! +${reward} DotsCoins added to your wallet!`, 'success');
  addNotification(`🎁 You claimed your daily reward: +${reward} DotsCoins!`);
  addActivity('🎁', `Claimed daily login reward (+${reward} DotsCoins)`);
}

// ── PWA Service Worker ────────────────────────────
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      // SW is optional — silence error
    }
  }
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupSmoothScroll();
  setupAccordion();
  setupScrollAnimations();
  initNavAuth();
  registerSW();
  // Delay daily reward slightly so nav auth renders first
  setTimeout(dailyLoginReward, 800);
  console.log('🍺 DotsBar v3.0 — Ready to vibe!');
});

// ── Export ────────────────────────────────────────
window.Dotsbar = {
  getUser, getToken, getCoins, setCoins, spendCoins, addCoins,
  logoutUser, getSocket, initSocket, showGlobalToast,
  addXP, getXP, getLevel, getXPProgress,
  getStat, incStat,
  addActivity, getActivity, formatActivityTime,
  addNotification, dailyLoginReward
};
