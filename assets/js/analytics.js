/* PTM — Analytics page */
(function () {
  'use strict';
  const U = PTM.util;
  PTM.init({ active: 'analytics' });

  const A = PTM.analytics;
  let range = 'today';

  function rangeMeta() {
    if (range === 'today') return { n: 24, seed: 11, labels: Array.from({ length: 24 }, (_, h) => (h < 10 ? '0' + h : h) + ':00'), unit: 'per hour', mult: 1 };
    if (range === '7') return { n: 7 * 8, seed: 22, labels: Array.from({ length: 7 * 8 }, (_, i) => 'D' + (Math.floor(i / 8) + 1)), unit: '3-hour buckets', mult: 3 };
    if (range === '30') return { n: 30, seed: 33, labels: Array.from({ length: 30 }, (_, i) => 'D' + (i + 1)), unit: 'per day', mult: 24 };
    // custom: derive span from the date inputs
    const f = new Date(document.getElementById('from').value || Date.now() - 86400000 * 9);
    const t = new Date(document.getElementById('to').value || Date.now());
    const days = Math.max(2, Math.min(90, Math.round((t - f) / 86400000) + 1));
    return { n: days, seed: 44 + days, labels: Array.from({ length: days }, (_, i) => 'D' + (i + 1)), unit: 'per day', mult: 24 };
  }

  function render() {
    const m = rangeMeta();
    document.getElementById('flow-badge').textContent = m.unit;

    let veh, moto, n;
    if (range === 'today') {
      veh = A.hourlyTraffic(m.seed);
      moto = A.hourlyBoda(m.seed);
      n = veh.length;
    } else {
      n = m.n;
      const scale = m.mult / 24;
      veh = A.series(m.seed + 1, n, Math.round(5200 * scale), Math.round(1700 * scale), Math.round(900 * scale));
      moto = A.series(m.seed + 2, n, Math.round(3100 * scale), Math.round(1100 * scale), Math.round(700 * scale));
    }
    const labels = m.labels.slice(0, n);

    PTM.charts.line('#ch-flow', {
      height: 260, labels,
      series: [
        { name: 'Vehicles', data: veh, color: '#ffc93c' },
        { name: 'Motorcycles / boda', data: moto, color: '#3ba7ff' }
      ]
    });

    const cases = PTM.cases.all();
    const byStatus = ['PAID', 'UNPAID', 'PENDING VERIFICATION', 'DISMISSED'].map((s, i) => ({
      label: s, value: cases.filter(c => c.status === s).length,
      color: ['#4ee79d', '#ff4d4d', '#ffc93c', '#5a6272'][i]
    })).filter(x => x.value);
    PTM.charts.donut('#ch-status', { size: 170, center: U.num(cases.length), sub: 'CASES', segments: byStatus });

    PTM.charts.bars('#ch-type', {
      height: 250, items: A.violationsByType(m.seed).map(x => ({ label: x.label, short: x.label.split(' ')[0], value: Math.round(x.value * (range === 'today' ? 0.12 : range === '7' ? 0.5 : 1)) }))
    });

    PTM.charts.bars('#ch-loc', {
      horizontal: true, items: A.violationsByLocation(m.seed).map(x => ({ label: x.label, value: Math.round(x.value * (range === 'today' ? 0.12 : range === '7' ? 0.5 : 1)) }))
    });

    const conf = A.series(m.seed + 5, n, 88, 4, 6);
    PTM.charts.line('#ch-conf', {
      height: 220, labels, area: false, yFmt: v => v.toFixed(0) + '%',
      series: [{ name: 'Mean detection confidence', data: conf, color: '#4ee79d' }]
    });

    const rev = A.series(m.seed + 9, n, range === 'today' ? 4.2 : 26, 1.4, 2.2).map(v => +(v).toFixed(1));
    PTM.charts.line('#ch-rev', {
      height: 220, labels, yFmt: v => 'U ' + v.toFixed(1) + 'M',
      series: [{ name: 'Fines collected (UGX millions)', data: rev, color: '#ffc93c' }]
    });

    const totalVeh = veh.slice(0, n).reduce((a, b) => a + b, 0);
    const totalMoto = moto.slice(0, n).reduce((a, b) => a + b, 0);
    const viol = A.violationsByType(m.seed).reduce((a, b) => a + b.value, 0) * (range === 'today' ? 0.12 : range === '7' ? 0.5 : 1);
    const avgConf = (conf.reduce((a, b) => a + b, 0) / conf.length).toFixed(1);
    document.getElementById('a-kpis').innerHTML = [
      ['Vehicles counted', U.num(totalVeh), m.unit === 'per hour' ? 'today so far' : 'in range'],
      ['Motorcycles counted', U.num(totalMoto), 'boda bodas & bicycles'],
      ['Violations detected', U.num(Math.round(viol)), 'all classes'],
      ['Mean confidence', avgConf + '%', 'detection quality'],
      ['Active incidents', U.num(PTM.incidents.active().length), 'live now']
    ].map(k => `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-sub">${k[2]}</div></div>`).join('');
  }

  document.getElementById('range-group').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#range-group button').forEach(x => x.classList.toggle('active', x === b));
    range = b.dataset.range;
    const custom = range === 'custom';
    document.getElementById('from').style.display = custom ? '' : 'none';
    document.getElementById('to').style.display = custom ? '' : 'none';
    render();
  });
  ['from', 'to'].forEach(id => document.getElementById(id).addEventListener('change', () => { if (range === 'custom') render(); }));

  render();
})();
