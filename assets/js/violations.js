/* PTM — Violations page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'violations' });

  const state = { q: '', status: 'all', type: 'all', district: 'all', shown: 25 };

  document.getElementById('type').innerHTML = '<option value="all">All violation types</option>' +
    PTM.rules.all().map(r => `<option value="${U.esc(r.key)}">${U.esc(r.label)}</option>`).join('');
  document.getElementById('district').innerHTML = '<option value="all">All districts</option>' +
    PTM.cameras.districts().map(d => `<option value="${U.esc(d.city)}">${U.esc(d.city)}</option>`).join('');

  const STATUS_BADGE = {
    'PAID': 'badge-paid', 'UNPAID': 'badge-unpaid', 'PENDING VERIFICATION': 'badge-pending',
    'RESOLVED': 'badge-resolved', 'DISMISSED': 'badge-offline'
  };

  function filtered() {
    let list = PTM.cases.all();
    if (state.status !== 'all') list = list.filter(c => c.status === state.status);
    if (state.type !== 'all') list = list.filter(c => c.violation === state.type);
    if (state.district !== 'all') list = list.filter(c => c.district === state.district);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(c => c.plate.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }
    return list;
  }

  function renderKpis() {
    const all = PTM.cases.all();
    const pend = PTM.cases.pending().length;
    const unpaid = PTM.cases.unpaid().length;
    const paid = PTM.cases.paid().length;
    const outstanding = PTM.cases.unpaid().reduce((a, c) => a + c.penalty, 0);
    document.getElementById('v-kpis').innerHTML = [
      ['Total cases', U.num(all.length), 'last 26 days'],
      ['Pending verification', U.num(pend), 'awaiting officer review'],
      ['Unpaid fines', U.num(unpaid), U.ugx(outstanding)],
      ['Paid', U.num(paid), 'receipts issued'],
      ['Dismissed', U.num(all.filter(c => c.status === 'DISMISSED').length), 'rejected on review']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
  }

  function render() {
    const list = filtered();
    document.getElementById('count').textContent = U.num(list.length) + ' cases';
    document.getElementById('body').innerHTML = list.slice(0, state.shown).map(c => `
      <tr>
        <td class="mono">${U.esc(c.id)}</td>
        <td class="muted mono tiny">${U.esc(c.date)} ${U.esc(c.time)}</td>
        <td><span class="plate">${U.esc(c.plate)}</span></td>
        <td>${U.esc(c.location)}<div class="tiny muted-2">${U.esc(c.district)}</div></td>
        <td>${U.esc(c.violationLabel)}</td>
        <td class="mono">${c.speed}/${c.speedLimit}</td>
        <td class="mono">${c.confidence.toFixed(2)}</td>
        <td><span class="badge ${STATUS_BADGE[c.status] || 'badge-offline'}">${U.esc(c.status)}</span></td>
        <td><button class="btn btn-ghost btn-xs" data-open="${U.esc(c.id)}">Evidence</button></td>
      </tr>`).join('') || '<tr><td colspan="9" class="empty">No cases match the current filters.</td></tr>';
    document.getElementById('more').style.display = state.shown < list.length ? '' : 'none';
  }

  /* deterministic evidence frames for a case */
  function evidenceFrames(c) {
    const cam = PTM.cameras.get(c.camId) || PTM.cameras.all()[0];
    const tags = ['BEFORE', 'BEFORE', 'VIOLATION', 'AFTER', 'AFTER'];
    return tags.map((tag, i) => {
      const cv = document.createElement('canvas');
      const sim = PTMSim.renderStill(cv, {
        seed: c.seed + i * 17, camId: cam.id, location: cam.location, district: cam.district,
        hour: c.hour, weather: cam.weather, density: cam.density, speedLimit: cam.speedLimit,
        intersection: cam.intersection, gps: cam.gps, quality: 'mid', ai: true, aiLabels: false,
        jitter: false, at: 6 + i * 2.4
      });
      sim.destroy();
      return { canvas: cv, tag, t: new Date(c.ts + (i - 2) * 2400) };
    });
  }

  function openCase(c) {
    PTM.audit('EVIDENCE_VIEW', { caseId: c.id, plate: c.plate });
    const frames = evidenceFrames(c);
    const tl = frames.map(f => {
      const wrap = document.createElement('div');
      wrap.className = 'tl-frame';
      wrap.appendChild(f.canvas);
      const lbl = document.createElement('div');
      lbl.className = 'tl-time';
      lbl.textContent = f.tag + ' · ' + U.stamp(f.t);
      wrap.appendChild(lbl);
      return wrap;
    });

    const m = PTM.modal({
      title: c.id + ' — ' + c.violationLabel,
      subtitle: `${U.esc(c.plate)} · ${U.esc(c.make)} ${U.esc(c.model)} (${U.esc(c.color)}) · ${U.esc(c.location)}, ${U.esc(c.district)}`,
      width: 1000,
      body: `
        <div class="row" style="flex-wrap:wrap;gap:10px;margin-bottom:16px">
          <span class="badge ${STATUS_BADGE[c.status] || 'badge-offline'}">${U.esc(c.status)}</span>
          <span class="badge badge-${c.severity === 'critical' ? 'violation' : 'pending'}">${U.esc(c.severity.toUpperCase())}</span>
          <span class="badge badge-blue">CONF ${(c.confidence * 100).toFixed(1)}%</span>
          <span class="badge badge-sim">SIMULATED EVIDENCE</span>
        </div>
        <div class="panel-title" style="margin-bottom:10px">Evidence timeline</div>
        <div class="timeline" id="ev-tl"></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-top:18px">
          <div class="stat"><div class="stat-value" style="font-size:1.3rem">${c.speed} <span class="tiny muted">km/h</span></div><div class="stat-label">Recorded speed (limit ${c.speedLimit})</div></div>
          <div class="stat"><div class="stat-value" style="font-size:1.3rem">${U.ugx(c.penalty)}</div><div class="stat-label">Configurable penalty</div></div>
          <div class="stat"><div class="stat-value" style="font-size:1.3rem">${U.esc(c.date)}</div><div class="stat-label">${U.esc(c.time)} EAT</div></div>
          <div class="stat"><div class="stat-value" style="font-size:1.3rem">${U.esc(c.verifiedBy || '—')}</div><div class="stat-label">Verified by</div></div>
        </div>
        ${c.status === 'PENDING VERIFICATION' ? `
          <div class="notice" style="margin-top:18px">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg>
            <div>This case has <b>not</b> been verified by a human. It cannot become an enforceable fine until an authorised officer confirms the evidence. Verification and dismissal are audit-logged.</div>
          </div>` : ''}
        ${c.rejectReason ? `<div class="notice" style="margin-top:18px"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg><div>Dismissed: ${U.esc(c.rejectReason)}</div></div>` : ''}`,
      footer: `
        ${c.status === 'PENDING VERIFICATION' ? `
          <button class="btn btn-green" id="ev-verify">Verify &amp; issue fine</button>
          <button class="btn btn-danger" id="ev-dismiss">Dismiss</button>` : ''}
        ${c.status === 'UNPAID' ? `<a class="btn btn-gold" href="fines.html">Go to payment</a>` : ''}
        <button class="btn btn-ghost" data-close>Close</button>`
    });
    const tlHost = m.el.querySelector('#ev-tl');
    tl.forEach(f => tlHost.appendChild(f));
    m.el.querySelector('[data-close]').addEventListener('click', m.close);

    const vb = m.el.querySelector('#ev-verify');
    if (vb) vb.addEventListener('click', () => {
      if (!PTM.session.require('verify', 'Case verification requires Commander or Super Admin authority.')) return;
      PTM.cases.verify(c.id, PTM.session.user().name);
      PTM.toast('green', 'Case verified', c.id + ' confirmed by ' + PTM.session.user().name + '. Fine issued as UNPAID.');
      m.close(); renderKpis(); render();
    });
    const db = m.el.querySelector('#ev-dismiss');
    if (db) db.addEventListener('click', () => {
      if (!PTM.session.require('verify', 'Case dismissal requires Commander or Super Admin authority.')) return;
      PTM.cases.reject(c.id, 'Officer review: evidence insufficient or detection uncertain');
      PTM.toast('amber', 'Case dismissed', c.id + ' was dismissed and will not be enforced.');
      m.close(); renderKpis(); render();
    });
  }

  let deb;
  document.getElementById('q').addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { state.q = e.target.value; state.shown = 25; render(); }, 200); });
  ['status', 'type', 'district'].forEach(id => document.getElementById(id).addEventListener('change', e => { state[id] = e.target.value; state.shown = 25; render(); }));
  document.getElementById('more').addEventListener('click', () => { state.shown += 25; render(); });
  document.getElementById('body').addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const c = PTM.cases.get(b.dataset.open);
    if (c) openCase(c);
  });

  renderKpis();
  render();
})();
