const loadBtn = document.getElementById('load');
const searchForm = document.getElementById('search');
const form = document.getElementById('myForm');
const tableContainer = document.getElementById('table-container');
const resetBtn = document.getElementById('reset');

document.querySelectorAll('button, input[type="submit"]').forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    try {
      const res = await fetch('/passwords/list', { credentials: 'include' });
      if (res.status === 401) {
        e.preventDefault(); 
        const data = await res.json();
        showAuthModal(data.error || 'Bitte zuerst einloggen');
      }
    } catch (err) {
      console.error('Fehler bei der Auth-Prüfung', err);
    }
  });
});

function showAuthModal(message) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${message}</h2>
      <p>Um fortzufahren, bitte einloggen oder registrieren.</p>
      <div class="modal-actions">
        <a href="/login.html" class="btn">Einloggen</a>
        <a href="/register.html" class="btn">Registrieren</a>
      </div>
      <button class="close-btn">×</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const length = document.getElementById('length').value;
  const count = document.getElementById('count').value;
  const numbers = form.querySelector('input[name="n"]').checked;
  const symbols = form.querySelector('input[name="ss"]').checked;

  try {
    const res = await fetch('/passwords/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ length, count, n: numbers, ss: symbols })
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        showAuthModal(data.error || 'Bitte zuerst einloggen');
        return;
      }
      alert(data.error || 'Fehler bei der Generierung');
      return;
}

let html = '<p>Generierte Passwörter:</p><table border="1"><tr><th>Passwort</th></tr>';
data.passwords.forEach((pwd) => {
  html += `<tr><td>${pwd}</td></tr>`;
});
html += '</table>';
tableContainer.innerHTML = html;


  } catch (err) {
    console.error(err);
    alert('Netzwerkfehler');
  }
});

loadBtn?.addEventListener('click', async () => {
  try {
    const res = await fetch('/passwords/list', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        showAuthModal(data.error || 'Bitte zuerst einloggen');
        return;
      }
      tableContainer.innerHTML = '<p>Fehler beim Laden</p>';
      return;
    }

    let html = '<p>Gespeicherte Passwörter:</p><table border="1"><tr><th>ID</th><th>Passwort</th><th>Erstellt</th></tr>';
    data.forEach((row) => {
      html += `<tr><td>${row.id}</td><td>${row.value}</td><td>${row.created_at}</td></tr>`;
    });
    html += '</table>';
    tableContainer.innerHTML = html;
  } catch (err) {
    console.error(err);
    tableContainer.innerHTML = '<p>Fehler bei der Anfrage</p>';
  }
});

resetBtn?.addEventListener('click', async () => {
  if (!confirm('Alle Passwörter löschen?')) return;
  try {
    const res = await fetch('/passwords/reset', { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        showAuthModal(data.error || 'Bitte zuerst einloggen');
        return;
      }
      alert('Fehler beim Löschen');
      return;
    }
    alert(data.message);
    tableContainer.innerHTML = '';
  } catch (err) {
    console.error(err);
    alert('Fehler bei der Anfrage');
  }
});

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('pid').value;
  const format = searchForm.querySelector('input[name="format"]:checked')?.value || 'json';
  if (!id) {
    alert('Bitte eine ID eingeben');
    return;
  }
  window.location.href = `/passwords/download/${id}?format=${format}`;
});

window.addEventListener('DOMContentLoaded', () => {
  const cookies = document.cookie.split(';').reduce((acc, c) => {
    const [key, value] = c.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

 if (cookies.loggedIn === 'false' || !cookies.loggedIn) {
  showAuthModal('Bitte zuerst einloggen');
}
});

