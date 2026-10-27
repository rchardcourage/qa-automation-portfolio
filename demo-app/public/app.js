const app = document.getElementById('app');
const nav = document.getElementById('nav');
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = () => localStorage.getItem('pv_token');
const role = () => localStorage.getItem('pv_role');

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && token()) {
    localStorage.removeItem('pv_token');
    localStorage.removeItem('pv_role');
    sessionStorage.setItem('pv_message', 'Your session has expired. Please sign in again.');
    location.hash = '#/login';
    throw new Error('session-expired');
  }
  return { status: res.status, ok: res.ok, data };
}
const errMsg = (r) => (r.data && r.data.error ? r.data.error.message : 'Something went wrong.');

function renderNav() {
  if (!token()) { nav.innerHTML = ''; return; }
  nav.innerHTML = `
    <a href="#/dashboard">Dashboard</a>
    <a href="#/transfer">Transfer</a>
    <a href="#/loans">Loans</a>
    ${role() === 'admin' ? '<a href="#/admin">Admin</a>' : ''}
    <button type="button" id="signout">Sign out</button>`;
  document.getElementById('signout').onclick = () => {
    localStorage.removeItem('pv_token');
    localStorage.removeItem('pv_role');
    location.hash = '#/login';
  };
}

const views = {
  login() {
    const message = sessionStorage.getItem('pv_message') || '';
    sessionStorage.removeItem('pv_message');
    app.innerHTML = `
      <section class="card">
        <h2>Sign in</h2>
        <p role="alert" class="error" data-testid="login-message" ${message ? '' : 'hidden'}>${esc(message)}</p>
        <form id="login-form" novalidate>
          <label for="email">Email</label><input id="email" type="email" autocomplete="username">
          <label for="password">Password</label><input id="password" type="password" autocomplete="current-password">
          <button class="primary" type="submit">Sign in</button>
        </form>
      </section>`;
    const msg = app.querySelector('[data-testid="login-message"]');
    const show = (t) => { msg.textContent = t; msg.hidden = false; };
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return show('Email and password are required.');
      const r = await api('/login', { method: 'POST', body: { email, password } });
      if (!r.ok) return show(errMsg(r));
      localStorage.setItem('pv_token', r.data.token);
      localStorage.setItem('pv_role', r.data.role);
      location.hash = '#/dashboard';
    };
  },

  async dashboard() {
    const [w, t] = await Promise.all([api('/wallet'), api('/transactions')]);
    const rows = t.data.transactions.map((x) =>
      `<tr><td>${esc(x.reference)}</td><td>${esc(x.type)}</td><td>${esc(x.counterparty)}</td><td>${naira(x.amount)}</td></tr>`).join('');
    app.innerHTML = `
      <section class="card">
        <h2>Wallet</h2>
        <p class="balance" data-testid="balance">${naira(w.data.balance)}</p>
        <p class="muted" data-testid="daily-usage">Spent today: ${naira(w.data.spentToday)} of ${naira(w.data.dailyLimit)} daily limit</p>
      </section>
      <section class="card">
        <h2>Recent activity</h2>
        <table data-testid="tx-table"><thead><tr><th>Reference</th><th>Type</th><th>Counterparty</th><th>Amount</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No transactions yet.</td></tr>'}</tbody></table>
      </section>`;
  },

  async transfer() {
    const w = await api('/wallet');
    app.innerHTML = `
      <section class="card">
        <h2>Send money</h2>
        <p class="muted" data-testid="available">Available: ${naira(w.data.balance)}</p>
        <form id="transfer-form" novalidate>
          <label for="to">Recipient email</label><input id="to" type="email">
          <label for="amount">Amount (₦)</label><input id="amount" type="number" step="any">
          <button class="primary" type="submit">Send money</button>
        </form>
        <p role="alert" class="error" data-testid="transfer-error" hidden></p>
        <p role="status" class="ok" data-testid="transfer-success" hidden></p>
      </section>`;
    const err = app.querySelector('[data-testid="transfer-error"]');
    const ok = app.querySelector('[data-testid="transfer-success"]');
    document.getElementById('transfer-form').onsubmit = async (e) => {
      e.preventDefault();
      err.hidden = true; ok.hidden = true;
      const raw = document.getElementById('amount').value;
      const r = await api('/transfer', { method: 'POST', body: { to: document.getElementById('to').value.trim(), amount: raw === '' ? null : Number(raw) } });
      if (!r.ok) { err.textContent = errMsg(r); err.hidden = false; return; }
      ok.textContent = `Transfer successful. Reference: ${r.data.reference}`;
      ok.hidden = false;
      app.querySelector('[data-testid="available"]').textContent = `Available: ${naira(r.data.balance)}`;
    };
  },

  async loans() {
    const mine = await api('/loans');
    const rows = mine.data.loans.map((l) =>
      `<tr><td>${l.id}</td><td>${naira(l.amount)}</td><td>${l.tenureMonths}</td><td data-testid="loan-status-${l.id}">${esc(l.status)}</td></tr>`).join('');
    app.innerHTML = `
      <section class="card">
        <h2>Apply for a loan</h2>
        <form id="loan-form" novalidate>
          <label for="loan-amount">Loan amount (₦)</label><input id="loan-amount" type="number" step="any">
          <label for="loan-tenure">Tenure (months)</label><input id="loan-tenure" type="number" step="any">
          <button class="primary" type="submit">Apply for loan</button>
        </form>
        <p role="alert" class="error" data-testid="loan-error" hidden></p>
        <p role="status" class="ok" data-testid="loan-status" hidden></p>
        <dl>
          <dt>Interest</dt><dd data-testid="loan-interest">-</dd>
          <dt>Total repayable</dt><dd data-testid="loan-total">-</dd>
          <dt>Monthly repayment</dt><dd data-testid="loan-monthly">-</dd>
        </dl>
      </section>
      <section class="card"><h2>My loans</h2>
        <table data-testid="loan-table"><thead><tr><th>ID</th><th>Amount</th><th>Months</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No loans yet.</td></tr>'}</tbody></table>
      </section>`;
    const q = (id) => document.getElementById(id);
    const err = app.querySelector('[data-testid="loan-error"]');
    const status = app.querySelector('[data-testid="loan-status"]');
    const set = (t, v) => (app.querySelector(`[data-testid="${t}"]`).textContent = v);
    async function quote() {
      status.hidden = true;
      const a = q('loan-amount').value, t = q('loan-tenure').value;
      if (a === '' || t === '') return;
      const r = await api(`/loans/quote?amount=${encodeURIComponent(a)}&tenure=${encodeURIComponent(t)}`);
      if (!r.ok) { err.textContent = errMsg(r); err.hidden = false; ['loan-interest', 'loan-total', 'loan-monthly'].forEach((k) => set(k, '-')); return; }
      err.hidden = true;
      set('loan-interest', naira(r.data.interest));
      set('loan-total', naira(r.data.totalRepayable));
      set('loan-monthly', naira(r.data.monthlyRepayment));
    }
    q('loan-amount').oninput = quote;
    q('loan-tenure').oninput = quote;
    q('loan-form').onsubmit = async (e) => {
      e.preventDefault();
      status.hidden = true; err.hidden = true;
      const r = await api('/loans', { method: 'POST', body: { amount: Number(q('loan-amount').value), tenure: Number(q('loan-tenure').value) } });
      if (!r.ok) { err.textContent = errMsg(r); err.hidden = false; return; }
      status.textContent = `Application submitted. Status: ${r.data.status}`;
      status.hidden = false;
    };
  },

  async admin() {
    const r = await api('/admin/loans');
    if (r.status === 403) {
      app.innerHTML = '<section class="card"><h2 data-testid="access-denied">Access denied</h2><p>You do not have permission to view this page.</p></section>';
      return;
    }
    const rows = r.data.loans.map((l) =>
      `<tr data-testid="admin-loan-${l.id}"><td>${l.id}</td><td>${esc(l.email)}</td><td>${naira(l.amount)}</td><td data-testid="admin-status-${l.id}">${esc(l.status)}</td>
       <td>${l.status === 'PENDING' ? `<button type="button" data-approve="${l.id}">Approve</button>` : ''}</td></tr>`).join('');
    app.innerHTML = `
      <section class="card"><h2>Loan applications</h2>
        <table><thead><tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No applications.</td></tr>'}</tbody></table>
      </section>`;
    app.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = async () => {
      await api(`/admin/loans/${b.dataset.approve}/approve`, { method: 'POST' });
      views.admin();
    }));
  },
};

async function route() {
  const name = (location.hash.replace(/^#\//, '') || 'dashboard');
  renderNav();
  if (!token() && name !== 'login') { location.hash = '#/login'; return; }
  if (token() && name === 'login') { location.hash = '#/dashboard'; return; }
  const view = views[name];
  if (!view) { location.hash = '#/dashboard'; return; }
  try { await view(); } catch (e) { if (e.message !== 'session-expired') throw e; }
}
window.addEventListener('hashchange', route);
route();
