/* PTM — Admin console */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'admin' });

  const sess = PTM.session.get();
  if (!sess) {
    document.getElementById('gate').style.display = '';
    document.getElementById('gate-icon').innerHTML = PTM.icon('lock', 34);
    return;
  }

  document.getElementById('console').style.display = '';
  document.getElementById('admin-sub').textContent = sess.user.name + ' · ' + sess.user.officerId + ' · ' + sess.user.station;
  document.getElementById('admin-role').textContent = PTM.roles.label(sess.role);

  /* ---------- tabs (role-scoped) ---------- */
  const TABS = [
    { key: 'users', label: 'Users & Roles', perm: '*' },
    { key: 'cameras', label: 'Cameras', perm: 'cameras' },
    { key: 'devices', label: 'Devices', perm: 'iot' },
    { key: 'rules', label: 'Rules & Penalties', perm: 'rules' },
    { key: 'fines', label: 'Fines', perm: 'fines' },
    { key: 'reports', label: 'Reports', perm: 'reports' },
    { key: 'audit', label: 'Audit Log', perm: '*' },
    { key: 'settings', label: 'Settings', perm: null }
  ];
  const allowed = TABS.filter(t => t.perm === null || PTM.session.can(t.perm));
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = allowed.map((t, i) => `<button data-tab="${t.key}" class="${i === 0 ? 'active' : ''}">${t.label}</button>`).join('');

  function showTab(key) {
    document.querySelectorAll('.tabpane').forEach(p => p.style.display = 'none');
    const pane = document.getElementById('pane-' + key);
    if (pane) pane.style.display = 'block';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
    if (key === 'users') renderUsers();
    if (key === 'cameras') renderCameras();
    if (key === 'devices') renderDevices();
    if (key === 'rules') renderRules();
    if (key === 'fines') renderFines();
    if (key === 'reports') renderReports();
    if (key === 'audit') renderAudit();
    if (key === 'settings') renderSettings();
  }
  tabsEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    showTab(b.dataset.tab);
  });

  /* ---------- users ---------- */
  function renderUsers() {
    const canEdit = PTM.session.can('*');
    document.getElementById('users-body').innerHTML = PTM.users.all().map(u => `
      <tr>
        <td><strong>${U.esc(u.name)}</strong></td>
        <td class="mono">${U.esc(u.officerId)}</td>
        <td><span class="badge badge-gold">${U.esc(PTM.roles.label(u.role))}</span></td>
        <td>${U.esc(u.station)}</td>
        <td>${u.twoFA ? '<span class="badge badge-online">ON</span>' : '<span class="badge badge-offline">OFF</span>'}</td>
        <td>${u.active ? '<span class="badge badge-online">ACTIVE</span>' : '<span class="badge badge-unpaid">DISABLED</span>'}</td>
        <td class="muted mono tiny">${U.ago(u.lastLogin)}</td>
        <td>${canEdit ? `<button class="btn btn-ghost btn-xs" data-toggle-user="${U.esc(u.id)}">${u.active ? 'Disable' : 'Enable'}</button>` : '<span class="tiny muted-2">read-only</span>'}</td>
      </tr>`).join('');
    document.getElementById('role-grid').innerHTML = PTM.roles.all().map(r => `
      <div class="role-card">
        <b>${U.esc(r.label)}</b>
        <p>${U.esc(r.desc)}</p>
        <p class="mono tiny muted-2" style="margin-top:8px">${r.perms.join(' · ')}</p>
      </div>`).join('');
  }
  document.getElementById('users-body').addEventListener('click', e => {
    const b = e.target.closest('[data-toggle-user]'); if (!b) return;
    if (!PTM.session.require('*', 'Only a Super Admin can modify officer accounts.')) return;
    const u = PTM.users.get(b.dataset.toggleUser);
    u.active = !u.active;
    PTM.audit('USER_' + (u.active ? 'ENABLED' : 'DISABLED'), { userId: u.id, name: u.name });
    PTM.toast('amber', u.active ? 'Account enabled' : 'Account disabled', u.name + ' (' + u.officerId + ')');
    renderUsers();
  });
  document.getElementById('add-user').addEventListener('click', () => {
    if (!PTM.session.require('*', 'Only a Super Admin can create officer accounts.')) return;
    PTM.toast('amber', 'Provisioning disabled in prototype', 'Officer creation would integrate with the national HR registry in a live deployment.');
  });

  /* ---------- cameras ---------- */
  function renderCameras() {
    const all = PTM.cameras.all();
    document.getElementById('cam-kpis').innerHTML = [
      ['Total', U.num(all.length), 'configured'],
      ['Online', U.num(PTM.cameras.online().length), 'streaming'],
      ['Offline', U.num(all.length - PTM.cameras.online().length), 'fault queue'],
      ['ANPR enabled', U.num(all.filter(c => c.anpr).length), 'plate capture']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
    document.getElementById('cams-body').innerHTML = all.slice(0, 60).map(c => `
      <tr>
        <td class="mono">${U.esc(c.id)}</td>
        <td>${U.esc(c.location)}</td>
        <td>${U.esc(c.district)}</td>
        <td class="muted">${U.esc(c.type)}</td>
        <td>${c.online ? '<span class="badge badge-online">ONLINE</span>' : '<span class="badge badge-offline">OFFLINE</span>'}</td>
        <td class="mono tiny">${U.esc(c.firmware)}</td>
        <td class="muted mono tiny">${U.esc(c.installed)}</td>
        <td><a class="btn btn-ghost btn-xs" href="cameras.html">Manage</a></td>
      </tr>`).join('');
  }

  /* ---------- devices ---------- */
  function renderDevices() {
    const all = PTM.devices.all();
    document.getElementById('dev-kpis').innerHTML = [
      ['Devices', U.num(all.length), 'field units'],
      ['Online', U.num(PTM.devices.online().length), 'reachable'],
      ['Faults', U.num(all.filter(d => d.health === 'FAULT').length), 'need repair'],
      ['Degraded', U.num(all.filter(d => d.health === 'DEGRADED').length), 'watch list']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
    document.getElementById('devs-body').innerHTML = all.slice(0, 60).map(d => `
      <tr>
        <td class="mono">${U.esc(d.id)}</td>
        <td>${U.esc(d.label)}</td>
        <td>${U.esc(d.district)}</td>
        <td class="mono tiny">${U.esc(d.proto)}</td>
        <td class="tiny">${U.esc(d.power)}</td>
        <td><span class="badge ${d.health === 'HEALTHY' ? 'badge-online' : d.health === 'DEGRADED' ? 'badge-pending' : 'badge-offline'}">${U.esc(d.health)}</span></td>
        <td><a class="btn btn-ghost btn-xs" href="iot.html">Manage</a></td>
      </tr>`).join('');
  }

  /* ---------- rules ---------- */
  function renderRules() {
    document.getElementById('rules-body').innerHTML = PTM.rules.all().map(r => `
      <tr data-rule="${U.esc(r.key)}">
        <td><strong>${U.esc(r.label)}</strong></td>
        <td><span class="switch"><input type="checkbox" data-f="enabled" ${r.enabled ? 'checked' : ''}><span></span></span></td>
        <td><span class="badge ${r.severity === 'critical' ? 'badge-violation' : 'badge-pending'}">${U.esc(r.severity.toUpperCase())}</span></td>
        <td><input class="input mono" data-f="confidence" type="number" min="0.5" max="0.99" step="0.01" value="${r.confidence}" style="max-width:90px"></td>
        <td><input class="input mono" data-f="penalty" type="number" min="0" step="10000" value="${r.penalty}" style="max-width:140px"></td>
        <td class="muted tiny">${U.esc(r.note)}</td>
      </tr>`).join('');
  }
  document.getElementById('rules-save').addEventListener('click', () => {
    if (!PTM.session.require('rules', 'Editing penalty rules requires Traffic Admin or Super Admin authority.')) return;
    const list = PTM.rules.all();
    document.querySelectorAll('#rules-body tr[data-rule]').forEach(tr => {
      const r = list.find(x => x.key === tr.dataset.rule);
      if (!r) return;
      r.enabled = tr.querySelector('[data-f="enabled"]').checked;
      r.confidence = U.clamp(parseFloat(tr.querySelector('[data-f="confidence"]').value) || r.confidence, 0.5, 0.99);
      r.penalty = Math.max(0, parseInt(tr.querySelector('[data-f="penalty"]').value, 10) || 0);
    });
    PTM.rules.save(list);
    PTM.audit('RULES_UPDATED', { count: list.length });
    PTM.toast('green', 'Rules saved', 'Penalty schedule and confidence thresholds updated.');
  });
  document.getElementById('rules-reset').addEventListener('click', () => {
    if (!PTM.session.require('rules', 'Editing penalty rules requires Traffic Admin or Super Admin authority.')) return;
    PTM.rules.reset();
    PTM.audit('RULES_RESET', {});
    PTM.toast('amber', 'Defaults restored', 'Rule set reverted to factory defaults.');
    renderRules();
  });

  /* ---------- fines ---------- */
  function renderFines() {
    const cases = PTM.cases.all();
    const outstanding = PTM.cases.unpaid().reduce((a, c) => a + c.penalty, 0);
    document.getElementById('fine-kpis').innerHTML = [
      ['Cases', U.num(cases.length), 'all time'],
      ['Outstanding', U.ugx(outstanding), U.num(PTM.cases.unpaid().length) + ' unpaid'],
      ['Collected', U.ugx(PTM.cases.paid().reduce((a, c) => a + c.penalty, 0)), U.num(PTM.cases.paid().length) + ' receipts'],
      ['Awaiting approval', U.num(PTM.cases.awaitingApproval().length), 'payments to review'],
      ['Pending', U.num(PTM.cases.pending().length), 'awaiting verification']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value" style="font-size:1.2rem">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
    document.getElementById('pay-approvals').innerHTML = PTM.cases.awaitingApproval().map(c => `
      <tr>
        <td class="mono">${U.esc(c.id)}</td>
        <td><span class="plate">${U.esc(c.plate)}</span></td>
        <td>${U.esc(c.payment.method)}</td>
        <td class="mono tiny">${U.esc(c.payment.reference)}</td>
        <td class="mono">${U.ugx(c.payment.amount)}</td>
        <td class="muted mono tiny">${U.esc(c.payment.date)} ${U.esc(c.payment.time)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-gold btn-xs" data-approve="${U.esc(c.id)}">Approve</button>
          <button class="btn btn-ghost btn-xs" data-reject="${U.esc(c.id)}">Reject</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="empty">No payments awaiting approval.</td></tr>';
    document.getElementById('fines-body').innerHTML = cases.slice(0, 50).map(c => `
      <tr>
        <td class="mono">${U.esc(c.id)}</td>
        <td><span class="plate">${U.esc(c.plate)}</span></td>
        <td>${U.esc(c.violationLabel)}</td>
        <td class="mono">${U.ugx(c.penalty)}</td>
        <td><span class="badge ${c.status === 'PAID' ? 'badge-paid' : c.status === 'UNPAID' ? 'badge-unpaid' : c.status === 'PENDING VERIFICATION' ? 'badge-pending' : 'badge-offline'}">${U.esc(c.status)}</span></td>
        <td class="muted">${U.esc(c.verifiedBy || '—')}</td>
      </tr>`).join('');
  }

  document.getElementById('pay-approvals').addEventListener('click', e => {
    const ap = e.target.closest('[data-approve]');
    const rj = e.target.closest('[data-reject]');
    if (ap) {
      if (!PTM.session.require('payments', 'Approving payments requires Payment Officer or Super Admin authority.')) return;
      const rec = PTM.cases.approvePayment(ap.dataset.approve);
      if (rec) {
        PTM.toast('green', 'Payment approved', rec.receipt + ' issued for ' + U.ugx(rec.amount) + '.');
        renderFines();
      }
    }
    if (rj) {
      if (!PTM.session.require('payments', 'Rejecting payments requires Payment Officer or Super Admin authority.')) return;
      const id = rj.dataset.reject;
      const m = PTM.modal({
        title: 'Reject payment — ' + id,
        width: 420,
        body: `<div class="field"><label for="rj-reason">Reason</label><input class="input" id="rj-reason" placeholder="e.g. transfer reference not found"></div>`,
        footer: `<button class="btn btn-gold" id="rj-confirm">Reject payment</button><button class="btn btn-ghost" data-close>Cancel</button>`
      });
      m.el.querySelector('[data-close]').addEventListener('click', m.close);
      m.el.querySelector('#rj-confirm').addEventListener('click', () => {
        PTM.cases.rejectPayment(id, m.el.querySelector('#rj-reason').value.trim());
        m.close();
        PTM.toast('red', 'Payment rejected', 'Case returned to UNPAID.');
        renderFines();
      });
    }
  });

  /* ---------- reports ---------- */
  function renderReports() {
    PTM.charts.bars('#rep-type', { height: 240, items: PTM.analytics.violationsByType(77).map(x => ({ label: x.label, short: x.label.split(' ')[0], value: x.value })) });
    const cases = PTM.cases.all();
    PTM.charts.donut('#rep-status', {
      size: 160, center: U.num(cases.length), sub: 'CASES',
      segments: ['PAID', 'UNPAID', 'PENDING VERIFICATION', 'DISMISSED'].map((s, i) => ({ label: s, value: cases.filter(c => c.status === s).length, color: ['#4ee79d', '#ff4d4d', '#ffc93c', '#5a6272'][i] })).filter(x => x.value)
    });
  }
  function csv(rows) {
    return rows.map(r => r.map(v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  document.getElementById('exp-cases').addEventListener('click', () => {
    if (!PTM.session.require('reports', 'Exporting reports requires reporting authority.')) return;
    const rows = [['case', 'plate', 'violation', 'district', 'date', 'speed', 'limit', 'confidence', 'status', 'penalty']];
    PTM.cases.all().forEach(c => rows.push([c.id, c.plate, c.violationLabel, c.district, c.date + ' ' + c.time, c.speed, c.speedLimit, c.confidence, c.status, c.penalty]));
    download('ptm-cases.csv', csv(rows));
    PTM.audit('REPORT_EXPORT', { kind: 'cases' });
  });
  document.getElementById('exp-audit').addEventListener('click', () => {
    if (!PTM.session.require('*', 'Audit export is restricted to Super Admin.')) return;
    const rows = [['when', 'action', 'actor', 'role', 'detail']];
    (PTM.store.get('audit', [])).forEach(a => rows.push([U.dateTime(new Date(a.ts)), a.action, a.actor, a.role, JSON.stringify(a.detail)]));
    download('ptm-audit.csv', csv(rows));
  });

  /* ---------- audit ---------- */
  function renderAudit() {
    const log = PTM.store.get('audit', []);
    document.getElementById('audit-count').textContent = U.num(log.length) + ' entries (last 300 kept)';
    document.getElementById('audit-body').innerHTML = (log.length ? log : [{ ts: Date.now(), action: 'NO_ENTRIES', actor: 'SYSTEM', role: 'GUEST', detail: {} }]).slice(0, 120).map(a => `
      <tr>
        <td class="muted mono tiny">${U.dateTime(new Date(a.ts))}</td>
        <td><span class="badge ${a.action.includes('DENIED') ? 'badge-violation' : 'badge-blue'}">${U.esc(a.action)}</span></td>
        <td>${U.esc(a.actor)}</td>
        <td class="muted tiny">${U.esc(a.role)}</td>
        <td class="mono tiny muted">${U.esc(JSON.stringify(a.detail))}</td>
      </tr>`).join('');
  }

  /* ---------- settings ---------- */
  function renderSettings() {
    const s = PTM.store.get('settings', { conf: 85, retention: 90, autocap: true, human: true });
    document.getElementById('set-conf').value = s.conf;
    document.getElementById('set-ret').value = s.retention;
    document.getElementById('set-autocap').checked = !!s.autocap;
    document.getElementById('set-human').checked = !!s.human;
    document.getElementById('set-session').innerHTML = `
      <div class="row-between small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span class="muted">Officer</span><b>${U.esc(sess.user.name)}</b></div>
      <div class="row-between small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span class="muted">ID</span><span class="mono">${U.esc(sess.user.officerId)}</span></div>
      <div class="row-between small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span class="muted">Role</span><span class="badge badge-gold">${U.esc(PTM.roles.label(sess.role))}</span></div>
      <div class="row-between small" style="padding:7px 0"><span class="muted">Signed in</span><span class="mono tiny">${U.dateTime(new Date(sess.ts))}</span></div>`;
  }
  document.getElementById('set-save').addEventListener('click', () => {
    const s = {
      conf: U.clamp(parseInt(document.getElementById('set-conf').value, 10) || 85, 50, 99),
      retention: U.clamp(parseInt(document.getElementById('set-ret').value, 10) || 90, 7, 365),
      autocap: document.getElementById('set-autocap').checked,
      human: document.getElementById('set-human').checked
    };
    PTM.store.set('settings', s);
    PTM.audit('SETTINGS_UPDATED', s);
    PTM.toast('green', 'Settings saved', 'Detection and evidence policy updated for this browser.');
  });
  document.getElementById('set-clear').addEventListener('click', () => {
    ['rules', 'payments', 'audit', 'session', 'settings'].forEach(k => PTM.store.set(k, k === 'audit' || k === 'payments' ? (k === 'payments' ? {} : []) : null));
    PTM.toast('amber', 'Local demo data cleared', 'Reloading…');
    setTimeout(() => location.reload(), 700);
  });

  showTab(allowed[0].key);
})();
