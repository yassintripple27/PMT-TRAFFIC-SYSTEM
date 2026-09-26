/* PTM — Police operations page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'police' });

  document.getElementById('login-lock').innerHTML = PTM.icon('lock', 22);

  const SEV = { critical: 'sev-critical', warning: 'sev-warning', info: 'sev-info' };

  /* ---------- OTP input behaviour ---------- */
  const otpInputs = Array.from(document.querySelectorAll('#otp-row input'));
  otpInputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '');
      if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) otpInputs[i - 1].focus();
    });
  });
  const otpValue = () => otpInputs.map(i => i.value).join('');

  function showErr(msg) {
    const el = document.getElementById('login-err');
    el.style.display = 'flex';
    el.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg><div>${U.esc(msg)}</div>`;
  }

  function doSignin() {
    const officerId = document.getElementById('officer').value.trim();
    const password = document.getElementById('password').value;
    const res = PTM.users.authenticate(officerId, password, otpValue());
    if (!res.ok) { showErr(res.error); return; }
    PTM.session.set({ user: { name: res.user.name, officerId: res.user.officerId, station: res.user.station }, role: res.user.role, ts: Date.now() });
    PTM.audit('LOGIN', { officerId: res.user.officerId, role: res.user.role });
    PTM.toast('green', 'Authenticated', 'Welcome, ' + res.user.name + '. Session scoped to ' + PTM.roles.label(res.user.role) + '.');
    enter();
  }
  document.getElementById('signin').addEventListener('click', doSignin);
  document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') doSignin(); });

  document.getElementById('signout').addEventListener('click', () => {
    PTM.audit('LOGOUT', {});
    PTM.session.clear();
    location.reload();
  });

  /* ---------- dashboard ---------- */
  function nearestUnit(inc) {
    const r = U.mulberry32(inc.seed || 7);
    const num = String(1 + Math.floor(r() * 60)).padStart(3, '0');
    return { label: 'UNIT PTM-' + num, km: +U.rnd(r, 0.4, 6.5).toFixed(1), eta: Math.ceil(U.rnd(r, 2, 14)) };
  }

  function renderKpis() {
    const act = PTM.incidents.active();
    const crit = act.filter(i => i.severity === 'critical').length;
    const resp = act.filter(i => i.status === 'RESPONDING').length;
    document.getElementById('p-kpis').innerHTML = [
      ['Active incidents', U.num(act.length), 'nationwide'],
      ['Critical', U.num(crit), 'accidents & emergencies'],
      ['Units responding', U.num(resp), 'en route now'],
      ['Awaiting verification', U.num(PTM.cases.pending().length), 'human review queue'],
      ['Cameras online', U.num(PTM.cameras.online().length), 'of ' + U.num(PTM.cameras.all().length)]
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
  }

  function renderIncidents() {
    const list = PTM.incidents.all().slice(0, 26);
    document.getElementById('inc-list').innerHTML = list.map(i => `
      <div class="alert-item ${SEV[i.severity] || 'sev-info'}" data-inc="${U.esc(i.id)}" style="cursor:pointer">
        <span class="alert-time">${U.ago(i.ts)}</span>
        <div class="alert-body">
          <div class="alert-title"><i></i>${U.esc(i.typeLabel)} · ${U.esc(i.district)}</div>
          <div class="alert-meta">${U.esc(i.location)} · ${U.esc(i.camId)}${i.plate ? ' · ' + U.esc(i.plate) : ''}</div>
          <div class="alert-meta" style="margin-top:4px">
            <span class="badge ${i.status === 'RESOLVED' ? 'badge-resolved' : i.status === 'RESPONDING' ? 'badge-blue' : i.status === 'ON SCENE' ? 'badge-online' : 'badge-pending'}">${U.esc(i.status)}</span>
            ${i.assignedUnit ? `<span class="mono tiny muted" style="margin-left:8px">${U.esc(i.assignedUnit)}</span>` : ''}
          </div>
        </div>
      </div>`).join('');
  }

  function renderQueues() {
    const sess = PTM.session.get();
    const mine = PTM.incidents.active().filter(i => i.district === sess.user.station || sess.user.station === 'National').slice(0, 6);
    document.getElementById('my-queue').innerHTML = mine.length ? mine.map(i => `
      <div class="row-between small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>${U.esc(i.typeLabel)}<div class="tiny muted-2">${U.esc(i.location)}</div></span>
        <span class="badge ${i.status === 'RESPONDING' ? 'badge-blue' : i.status === 'ON SCENE' ? 'badge-online' : 'badge-pending'}">${U.esc(i.status)}</span>
      </div>`).join('') : '<div class="empty" style="padding:16px">No incidents assigned to your station.</div>';

    const pend = PTM.cases.pending().slice(0, 6);
    const canVerify = PTM.session.can('verify');
    document.getElementById('verify-queue').innerHTML = (pend.length ? pend.map(c => `
      <div class="row-between small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span class="mono">${U.esc(c.plate)}<div class="tiny muted-2">${U.esc(c.violationLabel)} · conf ${(c.confidence * 100).toFixed(0)}%</div></span>
        ${canVerify ? `<button class="btn btn-green btn-xs" data-verify="${U.esc(c.id)}">Verify</button>` : '<span class="tiny muted-2">read-only</span>'}
      </div>`).join('') : '<div class="empty" style="padding:16px">Verification queue is clear.</div>') +
      (canVerify ? '' : '<p class="tiny muted-2" style="margin:10px 0 0">Your role cannot verify cases. Attempts are audit-logged.</p>');
  }

  function openIncident(inc) {
    const nu = nearestUnit(inc);
    const m = PTM.modal({
      title: inc.typeLabel,
      subtitle: `${U.esc(inc.id)} · ${U.esc(inc.location)}, ${U.esc(inc.district)} · ${U.esc(inc.gps)}`,
      width: 640,
      body: `
        <div class="row" style="flex-wrap:wrap;gap:10px;margin-bottom:16px">
          <span class="badge ${inc.severity === 'critical' ? 'badge-violation' : inc.severity === 'warning' ? 'badge-pending' : 'badge-info'}">${U.esc(inc.severity.toUpperCase())}</span>
          <span class="badge ${inc.status === 'RESOLVED' ? 'badge-resolved' : 'badge-live'}">${U.esc(inc.status)}</span>
          <span class="badge badge-sim">SIMULATED INCIDENT</span>
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          <div class="stat"><div class="stat-value" style="font-size:1.2rem">${U.esc(inc.camId)}</div><div class="stat-label">Source camera</div></div>
          <div class="stat"><div class="stat-value" style="font-size:1.2rem">${U.ago(inc.ts)}</div><div class="stat-label">Detected</div></div>
          <div class="stat"><div class="stat-value" style="font-size:1.2rem">${U.esc(inc.assignedUnit || '—')}</div><div class="stat-label">Assigned unit</div></div>
        </div>
        <div class="glass-soft" style="margin-top:16px;padding:14px;border-radius:10px">
          <div class="panel-title" style="margin-bottom:8px">Nearest available unit</div>
          <div class="row-between small">
            <span class="mono">${U.esc(nu.label)}</span>
            <span class="muted">${nu.km} km · ETA ${nu.eta} min</span>
          </div>
        </div>
        ${inc.plate ? `<div class="row small" style="margin-top:14px;gap:8px">Vehicle: <span class="plate">${U.esc(inc.plate)}</span></div>` : ''}`,
      footer: `
        <button class="btn btn-blue" id="inc-dispatch">Dispatch ${U.esc(nu.label)}</button>
        <button class="btn btn-green" id="inc-resolve">Mark resolved</button>
        <a class="btn btn-outline" href="command-center.html">View camera</a>
        <button class="btn btn-ghost" data-close>Close</button>`
    });
    m.el.querySelector('[data-close]').addEventListener('click', m.close);
    m.el.querySelector('#inc-dispatch').addEventListener('click', () => {
      if (!PTM.session.require('dispatch', 'Dispatch authorisation requires Commander or Super Admin authority.')) return;
      PTM.incidents.dispatch(inc.id, nu.label);
      PTM.toast('blue', 'Unit dispatched', nu.label + ' en route to ' + inc.location + ' (ETA ' + nu.eta + ' min).');
      m.close(); renderIncidents(); renderKpis();
    });
    m.el.querySelector('#inc-resolve').addEventListener('click', () => {
      if (!PTM.session.require('incidents', 'Your role cannot update incidents.')) return;
      PTM.incidents.setStatus(inc.id, 'RESOLVED');
      PTM.toast('green', 'Incident resolved', inc.id + ' closed by ' + PTM.session.user().name + '.');
      m.close(); renderIncidents(); renderKpis();
    });
    PTM.audit('INCIDENT_VIEW', { incidentId: inc.id });
  }

  function enter() {
    const sess = PTM.session.get();
    document.getElementById('login-shell').style.display = 'none';
    document.getElementById('dash').style.display = '';
    document.getElementById('dash-title').textContent = 'Welcome, ' + sess.user.name.split(' ')[0];
    document.getElementById('dash-sub').textContent = sess.user.officerId + ' · ' + sess.user.station + ' · signed in ' + U.dateTime(new Date(sess.ts));
    document.getElementById('dash-role').textContent = PTM.roles.label(sess.role);
    renderKpis(); renderIncidents(); renderQueues();
  }

  document.getElementById('inc-list').addEventListener('click', e => {
    const it = e.target.closest('[data-inc]'); if (!it) return;
    const inc = PTM.incidents.get(it.dataset.inc);
    if (inc) openIncident(inc);
  });
  document.getElementById('verify-queue').addEventListener('click', e => {
    const b = e.target.closest('[data-verify]'); if (!b) return;
    if (!PTM.session.require('verify', 'Case verification requires Commander or Super Admin authority.')) return;
    PTM.cases.verify(b.dataset.verify, PTM.session.user().name);
    PTM.toast('green', 'Case verified', b.dataset.verify + ' confirmed and issued as UNPAID.');
    renderQueues(); renderKpis();
  });

  setInterval(() => { if (PTM.session.get()) { renderIncidents(); renderKpis(); } }, 6000);

  if (PTM.session.get()) enter();
})();
