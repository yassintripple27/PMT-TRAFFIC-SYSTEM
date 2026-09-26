/* PTM — IoT page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'iot' });

  const state = { type: 'all', health: 'all', q: '', shown: 30 };

  const TYPE_ICON = { CAMERA: 'cam', SPEED: 'bolt', SIGNAL: 'alert', GPS: 'map', ROAD: 'grid', EDGE: 'chip', WEATHER: 'cloud' };

  function renderKpis() {
    const all = PTM.devices.all();
    const on = PTM.devices.online().length;
    const faults = PTM.devices.faults().length;
    const avgUp = (all.reduce((a, d) => a + d.uptime, 0) / all.length).toFixed(1);
    document.getElementById('iot-kpis').innerHTML = [
      ['Field devices', U.num(all.length), PTM.devices.types().length + ' device classes'],
      ['Online', U.num(on), ((on / all.length) * 100).toFixed(1) + '% reachable'],
      ['Faults / degraded', U.num(faults), 'technician queue'],
      ['Mean uptime', avgUp + '%', 'rolling 30 days'],
      ['Edge nodes', U.num(PTM.devices.byType('EDGE').length), 'C++ inference at the curb']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
  }

  function renderTypes() {
    document.getElementById('type-grid').innerHTML = PTM.devices.types().map(t => {
      const list = PTM.devices.byType(t.key);
      const on = list.filter(d => d.online).length;
      return `
      <div class="glass feature card-hover">
        <div class="feature-icon">${PTM.icon(TYPE_ICON[t.key] || 'chip', 20)}</div>
        <h3>${U.esc(t.label)}</h3>
        <p>${list.length} deployed · ${on} online · ${U.esc(t.proto)} · firmware in ${t.key === 'EDGE' || t.key === 'CAMERA' ? 'C / C++' : 'C'}</p>
        <div class="bar-track" style="margin-top:12px"><div class="bar-fill" style="width:${Math.round(on / list.length * 100)}%"></div></div>
      </div>`;
    }).join('');
    document.getElementById('type').innerHTML = '<option value="all">All device types</option>' +
      PTM.devices.types().map(t => `<option value="${U.esc(t.key)}">${U.esc(t.label)}</option>`).join('');
  }

  const ARCH = [
    ['Sensors & optics', 'CMOS imager, radar head, inductive loop, GPS antenna, weather mast.', 'cam'],
    ['Embedded firmware (C)', 'ISR-driven capture, ISP pre-processing, watchdog, power management on MCU/SoC.', 'chip'],
    ['Edge inference (C++)', 'Quantised detection + ANPR on the curb node; only metadata leaves the device.', 'bolt'],
    ['Field network', 'MQTT/TLS for telemetry, gRPC/TLS for evidence, Modbus for signals, LoRaWAN for battery sensors.', 'grid'],
    ['PTM ingest & store', 'Message broker, time-series telemetry, object store for evidence bundles.', 'play'],
    ['AI services', 'Tracking, behaviour analysis, incident detection, case assembly.', 'search'],
    ['Operations surfaces', 'Command center, police dashboard, admin console, analytics.', 'shield']
  ];
  document.getElementById('arch-flow').innerHTML = ARCH.map((a, i) => `
    <div class="flow-node" style="width:100%">${PTM.icon(a[2], 16)}&nbsp; ${i + 1}. ${a[0]}<small>${a[1]}</small></div>
    ${i < ARCH.length - 1 ? '<div class="flow-arrow"></div>' : ''}`).join('');

  function filtered() {
    let list = PTM.devices.all();
    if (state.type !== 'all') list = list.filter(d => d.type === state.type);
    if (state.health === 'HEALTHY') list = list.filter(d => d.health === 'HEALTHY');
    else if (state.health === 'DEGRADED') list = list.filter(d => d.health === 'DEGRADED');
    else if (state.health === 'FAULT') list = list.filter(d => !d.online || d.health === 'FAULT');
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(d => d.id.toLowerCase().includes(q) || d.location.toLowerCase().includes(q) || d.district.toLowerCase().includes(q));
    }
    return list;
  }

  const HEALTH_BADGE = { HEALTHY: 'badge-online', DEGRADED: 'badge-pending', FAULT: 'badge-offline' };

  function render() {
    const list = filtered();
    document.getElementById('count').textContent = U.num(list.length) + ' devices';
    document.getElementById('dev-body').innerHTML = list.slice(0, state.shown).map(d => `
      <tr>
        <td class="mono">${U.esc(d.id)}</td>
        <td>${PTM.icon(TYPE_ICON[d.type] || 'chip', 14)} ${U.esc(d.label)}</td>
        <td>${U.esc(d.location)}<div class="tiny muted-2">${U.esc(d.district)}</div></td>
        <td class="mono tiny">${U.esc(d.proto)}</td>
        <td class="tiny">${U.esc(d.power)}${d.battery !== null ? ` <span class="muted-2 mono">(${d.battery}%)</span>` : ''}</td>
        <td class="mono tiny">${U.esc(d.firmware)}</td>
        <td class="mono">${d.uptime.toFixed(1)}%</td>
        <td class="muted mono tiny">${U.ago(d.lastPing)}</td>
        <td><span class="badge ${HEALTH_BADGE[d.health]}">${U.esc(d.health)}</span></td>
      </tr>`).join('') || '<tr><td colspan="9" class="empty">No devices match the current filters.</td></tr>';
    document.getElementById('more').style.display = state.shown < list.length ? '' : 'none';
  }

  let deb;
  document.getElementById('q').addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { state.q = e.target.value; state.shown = 30; render(); }, 200); });
  document.getElementById('type').addEventListener('change', e => { state.type = e.target.value; state.shown = 30; render(); });
  document.getElementById('health').addEventListener('change', e => { state.health = e.target.value; state.shown = 30; render(); });
  document.getElementById('more').addEventListener('click', () => { state.shown += 30; render(); });

  renderKpis();
  renderTypes();
  render();
})();
