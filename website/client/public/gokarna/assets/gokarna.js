(function () {
  var STORAGE_KEY = 'gokarna_traveler_user';

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveUser(user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function renderAvatar(avatarEl, user, name) {
    avatarEl.textContent = '';
    if (user.profile_image) {
      var img = document.createElement('img');
      img.src = user.profile_image;
      img.alt = '';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  }

  function renderUser() {
    var user = getUser();
    var signin = document.getElementById('signin-link');
    var menu = document.getElementById('user-menu');
    if (!signin || !menu) return;
    if (user && user.id && user.token) {
      var name = user.name || 'Traveller';
      signin.hidden = true;
      menu.hidden = false;
      renderAvatar(document.getElementById('user-avatar'), user, name);
      document.getElementById('user-name').textContent = name.split(' ')[0];
      document.getElementById('user-fullname').textContent = name;
      document.getElementById('user-contact').textContent = user.phone || user.email || '';
    } else {
      signin.hidden = false;
      menu.hidden = true;
    }
  }

  function refreshSession() {
    var user = getUser();
    if (!user || !user.token) return;
    fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + user.token } })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (fresh) {
        if (!fresh || !fresh.id) return;
        var merged = fresh;
        merged.token = user.token;
        saveUser(merged);
        renderUser();
      })
      .catch(function () {});
  }

  function closeDropdown() {
    var dropdown = document.getElementById('user-dropdown');
    var btn = document.getElementById('user-btn');
    if (dropdown) dropdown.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('gokarna_theme', dark ? 'dark' : 'light');
      } catch (e) {}
    });
  }

  var userBtn = document.getElementById('user-btn');
  var dropdown = document.getElementById('user-dropdown');
  if (userBtn && dropdown) {
    userBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
      userBtn.setAttribute('aria-expanded', String(!dropdown.hidden));
    });
    document.addEventListener('click', closeDropdown);
  }

  var signout = document.getElementById('signout-btn');
  if (signout) {
    signout.addEventListener('click', function () {
      var user = getUser();
      if (user && user.token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
        }).catch(function () {});
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      window.location.reload();
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) renderUser();
  });

  renderUser();
  refreshSession();
})();
