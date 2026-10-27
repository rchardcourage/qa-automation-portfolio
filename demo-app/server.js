// PayVault: a small, self-contained demo app (wallet, transfers, loans, admin)
// used as the system under test for this portfolio. In-memory state, no real money.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 4173;
const RULES = {
  dailyLimitKobo: 300_000_00,
  minTransferKobo: 100_00,
  minLoanKobo: 10_000_00,
  maxLoanKobo: 500_000_00,
  maxTenure: 12,
  monthlyRate: 0.04, // flat 4% per month
  maxFailedLogins: 3,
  sessionMs: 30 * 60 * 1000,
};

let db;
function seed() {
  const user = (email, name, role, kycVerified, naira, password) => ({
    email, name, role, kycVerified, password, balanceKobo: naira * 100, failedLogins: 0, locked: false,
  });
  db = {
    users: {
      'ada@payvault.test': user('ada@payvault.test', 'Ada Obi', 'customer', true, 1_000_000, 'Passw0rd!'),
      'tunde@payvault.test': user('tunde@payvault.test', 'Tunde Bello', 'customer', false, 50_000, 'Passw0rd!'),
      'admin@payvault.test': user('admin@payvault.test', 'Ops Admin', 'admin', true, 0, 'Adm1nPass!'),
    },
    tokens: {},
    transactions: [],
    loans: [],
    idempotency: {},
    nextLoanId: 1,
  };
}
seed();

const naira = (kobo) => Math.round(kobo) / 100;
const ref = () => 'PV' + crypto.randomBytes(5).toString('hex').toUpperCase();

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (!raw) return resolve({ ok: true, value: {} });
      try { resolve({ ok: true, value: JSON.parse(raw) }); } catch { resolve({ ok: false }); }
    });
  });
}

function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token && db.tokens[token];
  if (!session || session.expires < Date.now()) return null;
  return db.users[session.email];
}

function parseAmountKobo(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { error: 'Amount must be a number.' };
  const kobo = Math.round(value * 100);
  if (Math.abs(value * 100 - kobo) > 1e-6) return { error: 'Amount cannot have more than 2 decimal places.' };
  return { kobo };
}

function quoteLoan(amountKobo, tenure) {
  const interest = Math.round(amountKobo * RULES.monthlyRate * tenure);
  const total = amountKobo + interest;
  return {
    amount: naira(amountKobo), tenureMonths: tenure, interest: naira(interest),
    totalRepayable: naira(total), monthlyRepayment: naira(Math.round(total / tenure)),
  };
}
function validateLoan(amount, tenure) {
  const a = parseAmountKobo(amount);
  if (a.error) return { error: a.error };
  if (a.kobo < RULES.minLoanKobo || a.kobo > RULES.maxLoanKobo) return { error: 'Loan amount must be between ₦10,000 and ₦500,000.' };
  if (!Number.isInteger(tenure) || tenure < 1 || tenure > RULES.maxTenure) return { error: 'Tenure must be a whole number of months between 1 and 12.' };
  return { amountKobo: a.kobo, tenure };
}
const spentToday = (email) =>
  db.transactions.filter((t) => t.email === email && t.type === 'transfer-out').reduce((s, t) => s + t.amountKobo, 0);
const publicTx = (t) => ({ reference: t.reference, type: t.type, counterparty: t.counterparty, amount: naira(t.amountKobo), createdAt: t.createdAt });

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;

  if (route === 'POST /api/test/reset') { seed(); return send(res, 200, { ok: true }); }
  if (route === 'POST /api/test/expire-session') {
    Object.values(db.tokens).forEach((t) => (t.expires = 0));
    return send(res, 200, { ok: true });
  }

  if (route === 'POST /api/login') {
    const body = await readBody(req);
    if (!body.ok) return fail(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
    const { email, password } = body.value;
    if (!email || !password) return fail(res, 400, 'MISSING_FIELDS', 'Email and password are required.');
    const user = db.users[String(email).toLowerCase()];
    if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    if (user.locked) return fail(res, 423, 'ACCOUNT_LOCKED', 'Account locked after repeated failed sign-ins. Contact support.');
    if (user.password !== password) {
      user.failedLogins += 1;
      if (user.failedLogins >= RULES.maxFailedLogins) user.locked = true;
      return user.locked
        ? fail(res, 423, 'ACCOUNT_LOCKED', 'Account locked after repeated failed sign-ins. Contact support.')
        : fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    user.failedLogins = 0;
    const token = crypto.randomBytes(16).toString('hex');
    db.tokens[token] = { email: user.email, expires: Date.now() + RULES.sessionMs };
    return send(res, 200, { token, role: user.role, name: user.name });
  }

  const user = authenticate(req);
  if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Authentication required or session expired.');

  if (route === 'GET /api/wallet') {
    return send(res, 200, {
      balance: naira(user.balanceKobo), currency: 'NGN',
      dailyLimit: naira(RULES.dailyLimitKobo), spentToday: naira(spentToday(user.email)),
    });
  }
  if (route === 'GET /api/transactions') {
    return send(res, 200, { transactions: db.transactions.filter((t) => t.email === user.email).reverse().map(publicTx) });
  }

  if (route === 'POST /api/transfer') {
    const body = await readBody(req);
    if (!body.ok) return fail(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
    const key = req.headers['idempotency-key'];
    if (key && db.idempotency[`${user.email}:${key}`]) {
      return send(res, 200, db.idempotency[`${user.email}:${key}`], { 'X-Idempotent-Replay': 'true' });
    }
    const { to, amount } = body.value;
    const parsed = parseAmountKobo(amount);
    if (parsed.error) return fail(res, 400, 'INVALID_AMOUNT', parsed.error);
    if (parsed.kobo <= 0) return fail(res, 400, 'INVALID_AMOUNT', 'Amount must be greater than zero.');
    if (parsed.kobo < RULES.minTransferKobo) return fail(res, 400, 'BELOW_MINIMUM', 'Minimum transfer is ₦100.00.');
    const recipient = typeof to === 'string' ? db.users[to.toLowerCase()] : null;
    if (typeof to !== 'string' || !to) return fail(res, 400, 'INVALID_RECIPIENT', 'Recipient email is required.');
    if (to.toLowerCase() === user.email) return fail(res, 400, 'SELF_TRANSFER', 'You cannot send money to yourself.');
    if (!recipient) return fail(res, 404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
    if (parsed.kobo > user.balanceKobo) return fail(res, 422, 'INSUFFICIENT_FUNDS', 'Insufficient funds.');
    if (spentToday(user.email) + parsed.kobo > RULES.dailyLimitKobo) {
      return fail(res, 422, 'DAILY_LIMIT_EXCEEDED', 'Daily transfer limit of ₦300,000.00 exceeded.');
    }
    const reference = ref();
    const createdAt = new Date().toISOString();
    user.balanceKobo -= parsed.kobo;
    recipient.balanceKobo += parsed.kobo;
    db.transactions.push({ email: user.email, type: 'transfer-out', counterparty: recipient.email, amountKobo: parsed.kobo, reference, createdAt });
    db.transactions.push({ email: recipient.email, type: 'transfer-in', counterparty: user.email, amountKobo: parsed.kobo, reference, createdAt });
    const result = { reference, amount: naira(parsed.kobo), to: recipient.email, balance: naira(user.balanceKobo) };
    if (key) db.idempotency[`${user.email}:${key}`] = result;
    return send(res, 201, result);
  }

  if (route === 'GET /api/loans/quote') {
    const v = validateLoan(Number(url.searchParams.get('amount')), Number(url.searchParams.get('tenure')));
    if (v.error) return fail(res, 400, 'INVALID_LOAN_REQUEST', v.error);
    return send(res, 200, quoteLoan(v.amountKobo, v.tenure));
  }
  if (route === 'GET /api/loans') {
    return send(res, 200, { loans: db.loans.filter((l) => l.email === user.email) });
  }
  if (route === 'POST /api/loans') {
    const body = await readBody(req);
    if (!body.ok) return fail(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
    const v = validateLoan(body.value.amount, body.value.tenure);
    if (v.error) return fail(res, 400, 'INVALID_LOAN_REQUEST', v.error);
    if (!user.kycVerified) return fail(res, 403, 'KYC_REQUIRED', 'Complete identity verification (KYC) before applying for a loan.');
    if (db.loans.some((l) => l.email === user.email && ['PENDING', 'APPROVED'].includes(l.status))) {
      return fail(res, 409, 'ACTIVE_LOAN_EXISTS', 'You already have an active or pending loan application.');
    }
    const loan = { id: db.nextLoanId++, email: user.email, status: 'PENDING', ...quoteLoan(v.amountKobo, v.tenure), principalKobo: v.amountKobo };
    db.loans.push(loan);
    return send(res, 201, { id: loan.id, status: loan.status, ...quoteLoan(v.amountKobo, v.tenure) });
  }

  if (url.pathname.startsWith('/api/admin/')) {
    if (user.role !== 'admin') return fail(res, 403, 'FORBIDDEN', 'You do not have permission to access this resource.');
    if (route === 'GET /api/admin/loans') return send(res, 200, { loans: db.loans });
    if (route === 'GET /api/admin/users') {
      return send(res, 200, { users: Object.values(db.users).map((u) => ({ email: u.email, role: u.role, kycVerified: u.kycVerified, locked: u.locked })) });
    }
    const m = url.pathname.match(/^\/api\/admin\/loans\/(\d+)\/approve$/);
    if (req.method === 'POST' && m) {
      const loan = db.loans.find((l) => l.id === Number(m[1]));
      if (!loan) return fail(res, 404, 'LOAN_NOT_FOUND', 'Loan not found.');
      if (loan.status !== 'PENDING') return fail(res, 409, 'INVALID_STATE', `Loan is already ${loan.status}.`);
      loan.status = 'APPROVED';
      const borrower = db.users[loan.email];
      borrower.balanceKobo += loan.principalKobo;
      db.transactions.push({ email: borrower.email, type: 'loan-disbursement', counterparty: 'PayVault', amountKobo: loan.principalKobo, reference: ref(), createdAt: new Date().toISOString() });
      return send(res, 200, loan);
    }
  }
  return fail(res, 404, 'NOT_FOUND', 'Route not found.');
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    const file = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Unexpected server error.');
  }
});
server.listen(PORT, () => console.log(`PayVault demo listening on http://localhost:${PORT}`));
