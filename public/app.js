/* Agenda Direksi — SPA vanilla, no build step. Layout mengikuti agenda-sekper.figcraft + agenda-direksi-v5.figcraft */
const $ = (s) => document.querySelector(s)
const app = $('#app')

let me = null
let unread = 0
let listFilter = 'semua'
let listTerm = ''
let notifSeg = 'semua'
let delSel = new Set() // id agenda terpilih untuk hapus multi

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const api = async (p, opts = {}) => {
  const r = await fetch('/api' + p, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'kesalahan server')
  return d
}
const toast = (msg, err = false) => {
  const t = $('#toast')
  t.textContent = msg
  t.className = 'toast' + (err ? ' err' : '')
  t.hidden = false
  setTimeout(() => { t.hidden = true }, 2600)
}
const fmtD = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
const fmtDlong = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
const fmtT = (s) => String(s || '').slice(0, 5)
const today = () => new Date().toISOString().slice(0, 10)
const hari = (tgl) => {
  if (!tgl) return ''
  const selisih = Math.round((new Date(tgl + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
  return selisih === 0 ? 'Hari ini' : selisih === 1 ? 'Besok' : selisih > 0 ? 'H-' + selisih : 'Lewat ' + (-selisih) + ' hari'
}
const inisial = (nama) => String(nama || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const avatarEl = (nama, cls = '') => `<span class="avatar ${cls}">${inisial(nama)}</span>`

const IC = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  cal: 'M17 12h-5v5h5v-5zM16 3v2H8V3H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V3h-2z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  send: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  chevR: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
  key: 'M12.65 10A5.99 5.99 0 0 0 7 6a6 6 0 1 0 0 12 5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  out: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z',
}
const svg = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="${IC[k]}"/></svg>`

const chipSt = (st) => {
  const map = {
    menunggu: ['wait', 'Menunggu jawaban'], hadir: ['hadir', 'Hadir'],
    tidak_hadir: ['alih', 'Mengalihkan'], ditolak: ['ditolak', 'Ditolak'],
    draft: ['draft', 'Draft'], aktif: ['wait', 'Menunggu jawaban'],
    selesai: ['selesai', 'Selesai'], batal: ['ditolak', 'Batal'],
  }
  const [cls, t] = map[st] || ['draft', st]
  return `<span class="chip ${cls}">${t}</span>`
}
const chipSaya = (a) => a.status === 'draft' ? chipSt('draft') : a.pemegang ? chipSt(a.status_saya || 'menunggu') : chipSt(a.status)

// ---------- shell ----------
const isDesk = () => window.matchMedia('(min-width: 768px)').matches && me.role === 'sekper'
function shell(content, active) {
  const sbNav = [
    ['#/', 'Dashboard', 'home'], ['#/agenda', 'Agenda', 'cal'], ['#/buat', 'Buat Agenda', 'plus'],
    ['#/pengguna', 'Pengguna', 'person'], ['#/notifikasi', 'Notifikasi', 'bell'],
  ]
  const side = `<div class="sidebar">
    <div class="brand"><span class="brand-dot"></span>Agenda Direksi</div>
    ${sbNav.map(([h, t, i]) => `<button class="sb-item ${active === t ? 'active' : ''}" data-nav="${h}">${svg(i)}${t}${t === 'Notifikasi' && unread ? `<span class="badge" style="position:static;margin-left:auto">${unread}</span>` : ''}</button>`).join('')}
    <div class="sb-foot">${avatarEl(me.nama)}
      <div style="flex:1;min-width:0"><div style="font-weight:bold;font-size:13px">${esc(me.nama)}</div><div class="muted" style="color:var(--ink4);font-size:11px">${esc(me.role)}</div></div>
      <button class="btn sm outline" data-act="logout">Keluar</button></div>
  </div>`
  const bnItems = [['#/', 'Beranda', 'home'], ['#/agenda', 'Agenda', 'cal'], ['#/notifikasi', 'Notifikasi', 'bell']]
  const bn = `<nav class="bottom-nav">
    ${bnItems.map(([h, t, i]) =>
      `<a class="nav-tab ${(location.hash === h || (h === '#/' && (location.hash === '#/' || location.hash === ''))) ? 'active' : ''}" href="${h}" data-nav="${h}">${svg(i, 22)}${t}${t === 'Notifikasi' && unread ? `<span class="badge">${unread}</span>` : ''}</a>`).join('')}
  </nav>`
  const fab = me.role === 'sekper' ? `<button class="fab" data-nav="#/buat" aria-label="Buat agenda">${svg('plus', 24)}</button>` : ''
  app.innerHTML = isDesk()
    ? `<div class="shell">${side}<div class="main">${content}</div></div>`
    : `<div class="mwrap">${content}</div>${fab}${bn}`
}
const mobHead = () => `<div class="mob-head">
  <div><div class="greet">Selamat datang,</div><div class="nama">${esc(me.nama)}</div></div>
  <div class="mob-head-r">
    <button class="bell" data-nav="#/notifikasi" aria-label="Notifikasi">${svg('bell', 22)}${unread ? '<span class="bell-dot"></span>' : ''}</button>
    <button class="av-btn" data-nav="#/profil" aria-label="Profil">${avatarEl(me.nama, '')}</button>
  </div></div>`

// ---------- views: auth ----------
function vLogin() {
  app.innerHTML = `<div class="auth">
    <div class="auth-hero">
      <div class="logo">${svg('cal', 18)}</div>
      <div class="auth-judul">Agenda Direksi</div>
      <div class="auth-sub">Masuk untuk melihat agenda dan konfirmasi kehadiran</div>
    </div>
    <form data-form="login" class="auth-body">
      <div class="field"><label class="label">Username</label><input name="username" autocomplete="username" required placeholder="username Anda"></div>
      <div class="field"><label class="label">Password</label><input name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div>
      <button class="btn btn-block">Masuk</button>
    </form></div>`
}
function vGantiPassword() {
  app.innerHTML = `<div class="auth">
    <div class="auth-hero">
      <div class="logo">${svg('key', 18)}</div>
      <div class="auth-judul">Ganti Password</div>
      <div class="auth-sub">Password awal = username. Buat password baru untuk lanjut.</div>
    </div>
    <form data-form="ganti-password" class="auth-body">
      <div class="field"><label class="label">Password baru</label><input name="password" type="password" minlength="6" required placeholder="minimal 6 karakter"></div>
      <button class="btn btn-block">Simpan password</button>
    </form></div>`
}

// ---------- views: sekper ----------
async function vDashboard() {
  delSel = new Set()
  const items = await api('/agenda?filter=semua')
  const aktif = items.filter(a => a.status === 'aktif').length
  const menunggu = items.filter(a => a.status === 'aktif' && a.pemegang).length
  const draft = items.filter(a => a.status === 'draft').length
  const recent = items.slice(0, 5)
  const terk = items.filter(a => a.status === 'selesai').length
  const alih = items.filter(a => a.n_alih > 0).length
  const stats = [[aktif, 'Agenda aktif'], [menunggu, 'Menunggu jawaban'], [terk, 'Terkonfirmasi'], [alih, 'Dialihkan']]
  const list = recent.length ? recent.map(a => rowAgenda(a, true)).join('')
    : emptyState('Belum ada agenda', isDesk() ? 'Buat agenda pertama Anda' : 'Tekan tombol + untuk membuat agenda', true)
  const tbl = `<table>
    <thead><tr><th class="td-chk"><input type="checkbox" class="sel-all"></th><th>Agenda</th><th>Tanggal</th><th>Pemegang</th><th>Status</th><th></th></tr></thead>
    <tbody>${items.map(a => `<tr class="rowlink" data-nav="#/agenda/${a.id}">
      <td class="td-chk"><input type="checkbox" class="sel-ag" value="${a.id}"></td>
      <td><div class="td-t">${esc(a.judul)}</div><div class="td-m">${esc(a.lokasi || 'TBD')}</div></td>
      <td class="td-m">${fmtD(a.tanggal)} · ${fmtT(a.jam)}</td>
      <td>${a.pemegang ? `<div class="td-pg">${avatarEl(a.pemegang, 'sm')}<span class="td-m">${esc(a.pemegang)}</span></div>` : '<span class="td-none">—</span>'}</td>
      <td>${chipSt(a.status)}</td>
      <td class="td-chev">${svg('chevR', 14)}</td>
    </tr>`).join('')}</tbody></table>`
  shell(`${isDesk() ? `<div class="page-head"><div><h1>Dashboard</h1><div class="sub">${fmtDlong(today())}</div></div>
    <div style="display:flex;gap:12px"><button class="btn outline danger-o" id="del-btn" data-act="hapus-sel" hidden>Hapus</button>
    <button class="btn" data-nav="#/buat">${svg('plus', 16)}Buat Agenda</button></div></div>
  <div class="statbar stat-cards">${stats.map(([n, l]) => `<div class="st"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('')}</div>
  <div class="card tblcard">${items.length ? tbl : emptyState('Belum ada agenda', 'Buat agenda pertama Anda', true)}</div>`
    : `${mobHead()}
  <div class="statbar">${[[aktif, 'Agenda aktif'], [menunggu, 'Menunggu jawaban'], [draft, 'Draft']].map(([n, l]) => `<div class="st"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('')}</div>
  <div class="label sec">AGENDA TERBARU</div>
  ${list}`}`, 'Dashboard')
}
function rowAgenda(a, compact = false) {
  return `<button class="agcard" data-nav="#/agenda/${a.id}">
    <div class="ag-main">
      <div class="ag-txt">
        <div class="ag-t">${esc(a.judul)}</div>
        <div class="meta">${fmtD(a.tanggal)} · ${fmtT(a.jam)}${a.lokasi ? ' · ' + esc(a.lokasi) : ''}</div>
        ${!compact && a.pemegang ? `<div class="meta">Pemegang: ${esc(a.pemegang)}</div>` : ''}
      </div>
      <div class="ag-side">${chipSaya(a)}<span class="chev">${svg('chevR', 16)}</span></div>
    </div></button>`
}
const emptyState = (judul, sub, buat = false) => `<div class="empty">
  <div class="pill-ico">${svg('cal', 40)}</div>
  <div class="empty-t">${judul}</div>
  <div class="empty-s">${sub}</div>
  ${buat ? `<button class="btn" data-nav="#/buat">Buat Agenda</button>` : ''}
</div>`
async function vAgendaList() {
  delSel = new Set()
  const items = await api(`/agenda?filter=${listFilter}&q=${encodeURIComponent(listTerm)}`)
  const filterRow = `<div class="filters">
      ${['semua', 'minggu', 'bulan'].map(f => `<button class="fchip ${listFilter === f ? 'on' : ''}" data-act="filter" data-v="${f}">${{ semua: 'Semua', minggu: 'Minggu ini', bulan: 'Bulan ini' }[f]}</button>`).join('')}
      <div class="search">${svg('search', 16)}<input id="q" placeholder="Cari agenda…" value="${esc(listTerm)}"></div>
    </div>`
  if (isDesk()) {
    shell(`<div class="page-head"><div><h1>Agenda</h1><div class="sub">Semua agenda yang Anda kelola</div></div>
      <div style="display:flex;gap:12px"><button class="btn outline danger-o" id="del-btn" data-act="hapus-sel" hidden>Hapus</button>
      <button class="btn" data-nav="#/buat">${svg('plus', 16)}Buat Agenda</button></div></div>
    ${filterRow}
    <div class="card tblcard">
      <table><thead><tr><th class="td-chk"><input type="checkbox" class="sel-all"></th><th>Agenda</th><th>Tanggal</th><th>Pemegang</th><th>Status</th><th></th></tr></thead><tbody>
      ${items.map(a => `<tr class="rowlink" data-nav="#/agenda/${a.id}">
        <td class="td-chk"><input type="checkbox" class="sel-ag" value="${a.id}"></td>
        <td><div class="td-t">${esc(a.judul)}</div></td>
        <td class="td-m">${fmtD(a.tanggal)} · ${fmtT(a.jam)}</td>
        <td><div class="td-pg">${a.pemegang ? avatarEl(a.pemegang, 'sm') + `<span>${esc(a.pemegang)}</span>` : '<span class="td-none">Belum ditentukan</span>'}</div></td>
        <td>${chipSaya(a)}</td>
        <td class="td-chev">${svg('chevR', 16)}</td>
      </tr>`).join('') || `<tr><td colspan="6">${emptyState('Belum ada agenda di filter ini', 'Coba filter lain atau buat agenda baru', true)}</td></tr>`}
      </tbody></table></div>`, 'Agenda')
    $('#q').addEventListener('input', (e) => { listTerm = e.target.value; clearTimeout(vAgendaList._t); vAgendaList._t = setTimeout(vAgendaList, 300) })
  } else {
    shell(`${mobHead()}
    <div class="page-head"><h1>Agenda Saya</h1><div class="sub">Agenda yang melibatkan Anda</div></div>
    ${filterRow}
    ${items.length ? items.map(a => rowAgenda(a)).join('') : emptyState('Belum ada agenda', 'Agenda yang dialihkan ke Anda akan muncul di sini')}`,
      'Agenda')
    const q = $('#q')
    if (q) q.addEventListener('input', (e) => { listTerm = e.target.value; clearTimeout(vAgendaList._t); vAgendaList._t = setTimeout(vAgendaList, 300) })
  }
}
async function vDetail(id) {
  const { agenda: a, chain: ch, pemegang: pg } = await api('/agenda/' + id)
  const mine = ch.find(c => c.user_id === me.id && c.status === 'menunggu')
  const sekper = me.role === 'sekper'
  const sub = `${fmtD(a.tanggal)} · ${fmtT(a.jam)} WIB${a.lokasi ? ' · ' + esc(a.lokasi) : ''}`

  let head
  if (isDesk()) {
    head = `<div class="page-head">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <button class="back-btn" data-nav="#/agenda" aria-label="Kembali">${svg('back', 20)}</button>
        <div><h1 style="font-size:22px">${esc(a.judul)}</h1><div class="sub">${sub}</div></div>
      </div>
      <div style="display:flex;gap:12px">
        ${a.status === 'draft' ? `<button class="btn" data-act="kirim" data-id="${a.id}">${svg('send', 16)}Kirim Agenda</button>` : ''}
        <button class="btn outline" data-nav="#/agenda/${a.id}/edit">Edit Agenda</button>
        ${a.status === 'aktif' ? `<button class="btn outline" data-act="kirim-notif" data-id="${a.id}">${svg('bell', 16)}Kirim Notif</button>` : ''}
        ${a.status === 'aktif' ? `<button class="btn outline danger-o" data-act="batal" data-id="${a.id}">Batalkan</button>` : ''}
        ${a.status === 'aktif' && !pg ? `<button class="btn" data-act="paksa" data-id="${a.id}">Paksa Titik</button>` : ''}
      </div></div>`
  } else {
    head = `<div class="det-head">
      <button class="back-btn" data-nav="back" aria-label="Kembali">${svg('back', 18)}</button>
      <button class="back-btn" data-nav="#/profil" aria-label="Profil">${svg('person', 18)}</button></div>
      <h1 class="det-judul">${esc(a.judul)}</h1><div class="det-sub">Agenda Direksi · ${fmtD(a.tanggal)} · ${fmtT(a.jam)}</div>`
  }

  const metaCard = `<div class="card">
    <div class="meta-rows">
      <div class="mrow">${svg('clock', 16)}<b>${fmtT(a.jam)} WIB</b></div>
      <div class="mrow">${svg('cal', 16)}<span>${fmtDlong(a.tanggal)}</span></div>
      ${a.lokasi ? `<div class="mrow">${svg('pin', 16)}<span>${esc(a.lokasi)}</span></div>` : ''}
    </div>
    <div class="divi"></div>
    <div class="creator">Dibuat oleh ${esc(ch[0]?.nama || 'Sekper')}</div>
    ${a.catatan ? `<div class="catatan">${esc(a.catatan)}</div>` : ''}
    ${isDesk() ? `<div class="divi"></div>
    <div class="label" style="margin-bottom:8px">Pemegang aktif</div>
    ${pg ? `<div class="pg-row">${avatarEl(pg.nama, 'lg')}<div style="flex:1;min-width:0"><div class="pg-nm">${esc(pg.nama)}</div><div class="pg-role">${esc(pg.role)}</div></div>${chipSt('menunggu')}</div>`
      : `<div style="color:var(--red);font-weight:bold">Rantai mentok — tidak ada pemegang aktif</div>
         <div style="color:var(--ink4);font-size:12px;margin-top:4px">Semua penerima sudah menjawab / menolak. Paksa titik ke user lain atau batalkan agenda.</div>`}
    <div class="divi"></div>
    <div class="info-cols">
      <div><div class="label">Tanggal & waktu</div><div class="info-v">${fmtD(a.tanggal)} · ${fmtT(a.jam)} WIB</div></div>
      <div><div class="label">Lokasi</div><div class="info-v">${esc(a.lokasi || '—')}</div></div>
    </div>` : ''}
  </div>`

  const tlDot = (st) => st === 'hadir' ? 'green' : st === 'menunggu' ? 'hollow' : st === 'ditolak' ? 'red' : 'gray'
  const timeline = ch.map(c => `<div class="tl-item"><span class="tl-dot ${tlDot(c.status)}"></span>
    ${c.waktu_respon ? `<span class="tl-time">${fmtD(c.waktu_respon.slice(0, 10))} · ${c.waktu_respon.slice(11, 16)}</span>` : ''}
    <div class="tl-t" style="font-weight:${c.status === 'menunggu' ? 'normal' : 'bold'}">${esc(c.nama)} <span class="tl-role">(${esc(c.role)})</span></div>
    <div class="tl-sub">${{ hadir: 'Hadir', menunggu: 'Menunggu konfirmasi kehadiran', tidak_hadir: `Mengalihkan ke ${esc((ch.find(x => x.id === c.alih_ke_id) || {}).nama || '—')}`, ditolak: 'Menolak pengalihan' }[c.status] || esc(c.status)}</div>
    ${c.alasan ? `<div class="tl-sub">Alasan: ${esc(c.alasan)}</div>` : ''}
  </div>`).join('')

  const trace = !isDesk() && ch.length > 0 ? `<div class="label sec">RANTAI PENGALIHAN</div>
  <div class="card"><div class="trace">
    ${ch.map((c, i) => {
    const next = ch[i + 1]
    const lineCls = next ? (next.status === 'menunggu' && c.status !== 'menunggu' ? 'sky' : 'done') : ''
    const isMine = c.user_id === me.id
    return `${i > 0 ? `<span class="tr-line ${lineCls}"></span>` : ''}
      <div class="tr-node">
        <span class="tr-dot ${c.status === 'menunggu' ? 'ring' : c.status === 'hadir' ? 'green' : c.status === 'ditolak' ? 'red' : ''}"></span>
        <span class="tr-nm ${isMine ? 'me' : ''}">${esc(c.nama.split(' ')[0])}</span>
      </div>`
  }).join('')}
  </div>
  ${mine ? `<div class="tr-note">Anda pemegang aktif agenda ini</div>` : ''}
  </div>` : ''

  const banner = mine ? `<div class="banner">${svg('bell', 16)}Menunggu jawaban Anda — ${hari(a.tanggal).toLowerCase()} ${fmtT(a.jam)}</div>` : ''
  const ctaMobile = !isDesk() && mine ? `
    <button class="btn outline btn-block" data-act="alih" data-id="${mine.id}">Tidak dapat hadir — alihkan</button>
    <button class="btn btn-block" data-act="hadir" data-id="${mine.id}">Hadir</button>
    <div class="helper">Pengalihan wajib menyertakan alasan</div>` : ''
  const ctaSekperMobile = !isDesk() && sekper ? `
    <div style="display:flex;gap:12px;margin-top:16px">
      ${a.status === 'draft' ? `<button class="btn" style="flex:1" data-act="kirim" data-id="${a.id}">Kirim Agenda</button>` : ''}
      ${a.status === 'aktif' ? `<button class="btn outline" style="flex:1" data-act="kirim-notif" data-id="${a.id}">${svg('bell', 16)}Kirim Notif</button>` : ''}
      ${a.status === 'aktif' ? `<button class="btn outline danger-o" style="flex:1" data-act="batal" data-id="${a.id}">Batalkan</button>` : ''}
      ${a.status === 'aktif' && !pg ? `<button class="btn" style="flex:1" data-act="paksa" data-id="${a.id}">Paksa Titik</button>` : ''}
    </div>` : ''

  shell(`${head}
  ${metaCard}
  ${trace}
  ${banner}
  ${ctaMobile}${ctaSekperMobile}
  <div class="card timeline-wrap"><div class="label" style="margin-bottom:4px">Riwayat disposisi</div><div class="timeline">${timeline}</div></div>
  ${a.status === 'draft' && isDesk() ? '<div class="card" style="margin-top:16px;color:var(--ink4)">Draft — belum dikirim ke peserta. Tekan Kirim Agenda untuk mengirim.</div>' : ''}
  `, 'Agenda')
}
async function vAlih(pesertaId) {
  const peng = await api('/users/pengganti')
  shell(`<div class="det-head">
    <button class="back-btn" data-nav="back" aria-label="Kembali">${svg('back', 18)}</button>
    <div style="margin-left:14px"><div class="fm-judul">Alihkan Agenda</div></div></div>
  <form data-form="alih" data-id="${pesertaId}" class="fm">
    <div class="label sec">PILIH PENGGANTI</div>
    ${peng.map(p => `<label class="opt">
      ${avatarEl(p.nama, 'lg')}
      <span class="opt-txt"><span class="opt-nm">${esc(p.role)} ${esc(p.nama)}</span></span>
      <input type="radio" name="pengganti" value="${p.id}" required>
      <span class="radio"></span></label>`).join('') || '<div class="helper">Tidak ada pengganti tersedia</div>'}
    <div class="label sec">ALASAN PENGALIHAN (WAJIB)</div>
    <textarea name="alasan" rows="4" required placeholder="Contoh: bertepatan dengan kegiatan lapangan di luar kota"></textarea>
    <div class="infobar">${svg('info', 16)}Pengganti langsung menerima notifikasi dan menjadi pemegang aktif</div>
    <div class="helper">Tidak bisa sama sekali? <button type="button" class="btn link danger" data-act="tolak" data-id="${pesertaId}">Tolak tanpa pengganti</button></div>
    <button class="btn btn-block sticky">${svg('send', 16)}Kirim Pengalihan</button>
  </form>`, 'Agenda')
}
async function vBuat(id) {
  const isEdit = !!id
  let a = {}
  let terpilih = []
  if (isEdit) {
    const d = await api('/agenda/' + id)
    a = d.agenda
    terpilih = d.chain.map(c => c.user_id)
  }
  const users = (await api('/users')).filter(u => u.status === 'aktif' && u.role !== 'sekper')
  const fld = (l, inp) => `<div class="field"><label class="label">${l}</label>${inp}</div>`
  const form = `
    ${fld('JUDUL AGENDA', `<input name="judul" required value="${esc(a.judul || '')}" placeholder="Contoh: Rapat Evaluasi Kinerja Q2">`)}
    <div style="display:flex;gap:12px">
      <div class="field" style="flex:1"><label class="label">TANGGAL</label><input name="tanggal" type="date" required value="${a.tanggal || today()}"></div>
      <div class="field" style="flex:1"><label class="label">WAKTU</label><input name="jam" type="time" required value="${fmtT(a.jam) || '09:00'}"></div>
    </div>
    ${fld('LOKASI', `<input name="lokasi" placeholder="Ruang Rapat / link Zoom" value="${esc(a.lokasi || '')}">`)}
    ${fld('CATATAN', `<textarea name="catatan" rows="3" placeholder="Catatan untuk peserta (opsional)…">${esc(a.catatan || '')}</textarea>`)}`
  const peserta = `<div class="label sec ps-head">PESERTA <span class="hint">pilih minimal 1</span></div>
    <div class="ps-list">
    ${users.map(u => `<label class="ps-row">
      ${avatarEl(u.nama, 'md')}
      <span class="ps-nm">${esc(u.role)} — ${esc(u.nama)}</span>
      <input type="checkbox" name="peserta" value="${u.id}" ${terpilih.includes(u.id) ? 'checked' : ''}>
      <span class="cbox"></span></label>`).join('')}
    </div>
    <div class="note-bar">${svg('info', 16)}Peserta yang tidak dapat hadir dapat mengalihkan tugas atau menolak</div>`
  const btns = isDesk()
    ? `<div class="form-foot"><button type="button" class="btn outline" data-act="tutup-buat">Batal</button>
       <button type="button" class="btn outline" data-act="simpan-draft">${svg('check', 16)}Simpan Draft</button>
       <button type="submit" class="btn">${svg('send', 16)}Simpan & Kirim</button></div>`
    : `<div class="helper" style="margin-top:12px">Peserta mendapat notifikasi H-1 dan hari-H</div>
       <button type="submit" class="btn btn-block sticky">${svg('send', 16)}Simpan & Kirim Undangan</button>`
  shell(`${isDesk()
    ? `<div class="page-head"><div><h1>${isEdit ? 'Edit Agenda' : 'Buat Agenda'}</h1><div class="sub">Undangan otomatis H-1 & hari-H</div></div></div>
    <form data-form="simpan-agenda" data-id="${id || ''}" class="card buat-grid">
      <div class="buat-l">${form}</div>
      <div class="buat-r">${peserta}</div>
      ${btns}</form>`
    : `<div class="det-head"><button class="back-btn" data-nav="#/" aria-label="Kembali">${svg('back', 18)}</button>
       <div style="margin-left:14px"><div class="fm-judul">${isEdit ? 'Edit Agenda' : 'Buat Agenda'}</div><div class="det-sub">Undangan terkirim H-1 & hari-H</div></div></div>
    <form data-form="simpan-agenda" data-id="${id || ''}" class="fm">
      ${form}${peserta}${btns}</form>`}`, 'Buat Agenda')
}
async function vPengguna() {
  const users = await api('/users')
  shell(`<div class="page-head"><div><h1>Pengguna</h1><div class="sub">Kelola akun dan role</div></div>
    <button class="btn" data-act="tambah-user">${svg('plus', 16)}Tambah</button></div>
  <div class="card" id="form-user" hidden style="margin-bottom:16px">
    <form data-form="user-baru"><div style="display:flex;gap:12px;flex-wrap:wrap">
      <input name="nama" placeholder="Nama lengkap" required style="flex:2;min-width:160px">
      <input name="username" placeholder="Username" required style="flex:1;min-width:120px">
      <select name="role" style="flex:1;min-width:120px"><option value="direksi">Direksi</option><option value="kadiv">Kadiv</option><option value="kabak">Kabak</option><option value="sekper">Sekper</option></select>
      <button class="btn">Simpan</button></div>
      <p class="helper" style="margin-top:8px">Password awal = username, wajib diganti saat login pertama.</p>
    </form></div>
  <div class="card tblcard">
    <table><thead><tr><th>Nama</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
    ${users.map(u => `<tr>
      <td><div class="td-pg">${avatarEl(u.nama, 'sm')}<span><div class="td-t">${esc(u.nama)}</div><div class="td-m">${esc(u.username)}${u.push_gagal ? ' · push gagal' : ''}</div></span></div></td>
      <td class="td-m">${esc(u.role)}</td>
      <td><select class="st-sel" data-act="ubah-status" data-id="${u.id}">
        ${['aktif', 'cuti', 'nonaktif'].map(s => `<option ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td style="text-align:right"><button class="btn sm outline danger-o" data-act="hapus-user" data-id="${u.id}">Hapus</button></td>
    </tr>`).join('')}
    </tbody></table></div>`, 'Pengguna')
}

// ---------- views: responder ----------
async function vBeranda() {
  const items = await api('/agenda?filter=semua')
  const naik = items.filter(a => a.tanggal >= today()).sort((x, y) => x.tanggal.localeCompare(y.tanggal))
  const hero = naik[0] || items[0]
  const mendatang = (naik.length ? naik.slice(1, 4) : items.slice(1, 4))
  const heroHtml = hero ? `<button class="hero" data-nav="#/agenda/${hero.id}">
    <div class="hero-l">
      <div class="label sec">AGENDA BERIKUTNYA</div>
      <div class="hero-t">${esc(hero.judul)}</div>
      <div class="mrow">${svg('clock', 15)}<span>${hari(hero.tanggal)} · ${fmtD(hero.tanggal)} · ${fmtT(hero.jam)} WIB</span></div>
      ${hero.lokasi ? `<div class="mrow">${svg('pin', 15)}<span>${esc(hero.lokasi)}</span></div>` : ''}
      <div class="hero-chip">${hero.status_saya === 'hadir' ? 'Kehadiran tercatat' : hero.pemegang ? 'Menunggu jawaban Anda' : 'Agenda baru'}</div>
    </div>
    <div class="hero-r"><div class="hero-h">${hero.tanggal === today() ? 'H' : 'H-' + Math.max(1, Math.round((new Date(hero.tanggal + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000))}</div>
    <span class="chev">${svg('chevR', 20)}</span></div>
  </button>` : ''
  shell(`${mobHead()}
  ${heroHtml}
  <div class="statbar st-inline">
    <div class="st"><div class="num">${naik.length}</div><div class="lbl">Agenda mendatang</div></div>
    <div class="st"><div class="num">${items.filter(a => a.status_saya === 'menunggu' && a.pemegang).length}</div><div class="lbl">Menunggu jawaban</div></div>
  </div>
  ${mendatang.length ? `<div class="label sec">AGENDA MENDATANG</div>${mendatang.map(a => rowAgenda(a, true)).join('')}` : ''}`,
    'Beranda')
}
async function vNotifikasi() {
  const { items, unread: n } = await api('/notifikasi')
  unread = n
  const segs = [['semua', 'Semua'], ['agenda', 'Agenda'], ['pengalihan', 'Pengalihan']]
  const tipeGrp = { agenda_baru: 'agenda', h1: 'agenda', h: 'agenda', alihan: 'pengalihan', paksa: 'pengalihan', ditolak: 'pengalihan' }
  const tampil = items.filter(x => notifSeg === 'semua' || tipeGrp[x.tipe] === notifSeg)
  const icon = { agenda_baru: 'cal', alihan: 'send', h1: 'clock', h: 'clock', paksa: 'info', ditolak: 'back' }
  let lastDay = ''
  const rows = tampil.map(x => {
    const day = x.waktu.slice(0, 10)
    const isToday = day === today()
    const isYest = day === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const lbl = isToday ? 'HARI INI' : isYest ? 'KEMARIN' : fmtD(day).toUpperCase()
    const g = lbl !== lastDay ? `<div class="label sec">${lbl}</div>` : ''
    lastDay = lbl
    return g + `<button class="notif ${x.dibaca ? '' : 'unread'}" data-act="buka-notif" data-id="${x.id}" data-agenda="${x.agenda_id}">
      <span class="n-ico">${svg(icon[x.tipe] || 'bell', 18)}</span>
      <span class="n-txt"><span class="n-t">${{ agenda_baru: 'Agenda baru', alihan: 'Pengalihan agenda', h1: 'Pengingat H-1', h: 'Hari ini', paksa: 'Titik paksa', ditolak: 'Pengalihan ditolak' }[x.tipe]}</span>
      <span class="n-s">${esc(x.judul)}</span></span>
      <span class="n-w">${x.waktu.slice(11, 16)}</span>
      ${x.dibaca ? '' : '<span class="n-dot"></span>'}
    </button>`
  }).join('')
  shell(`${mobHead()}
  <div class="page-head"><div><h1>Notifikasi</h1><div class="sub">${n} belum dibaca</div></div>
    ${n ? '<button class="linkbtn" data-act="baca-semua">Tandai dibaca</button>' : ''}</div>
  <div class="seg">${segs.map(([v, t]) => `<button class="seg-b ${notifSeg === v ? 'on' : ''}" data-act="notif-seg" data-v="${v}">${t}</button>`).join('')}</div>
  ${tampil.length ? rows : `<div class="empty"><div class="pill-ico">${svg('bell', 40)}</div>
    <div class="empty-t">Belum ada notifikasi</div><div class="empty-s">Notifikasi H-1, hari-H, dan pengalihan<br>dari agenda akan muncul di sini</div></div>`}`,
    'Notifikasi')
}
function vProfil() {
  shell(`<div class="prof-hero">
    <button class="back-btn dark" data-nav="#/" aria-label="Kembali">${svg('back', 18)}</button>
    ${avatarEl(me.nama, 'xl')}
    <div class="prof-nm">${esc(me.nama)}</div>
    <span class="prof-role">${esc(me.role)}</span>
    <div class="prof-un">@${esc(me.username)}</div>
  </div>
  <div class="card prof-menu">
    <button class="pm-item" data-nav="#/ganti-password">${svg('key', 18)}<span class="pm-t">Ubah Password</span><span class="pm-chev">${svg('chevR', 16)}</span></button>
    <div class="divi"></div>
    <button class="pm-item" data-nav="#/notifikasi">${svg('bell', 18)}<span class="pm-t">Notifikasi</span>${unread ? `<span class="badge" style="position:static;margin-left:auto;margin-right:8px">${unread}</span>` : ''}<span class="pm-chev">${svg('chevR', 16)}</span></button>
  </div>
  <div class="card prof-menu">
    <button class="pm-item danger" data-act="logout">${svg('out', 18)}<span class="pm-t">Keluar</span></button>
  </div>
  <div class="ver">Agenda Direksi · v1.0.0</div>`, '')
}

// ---------- modals ----------
function modal(html) {
  document.querySelectorAll('.modal-bg').forEach((b) => b.remove())
  const bg = document.createElement('div')
  bg.className = 'modal-bg'
  bg.innerHTML = `<div class="modal">${html}</div>`
  bg.addEventListener('click', (e) => { if (e.target === bg) bg.remove() })
  document.body.appendChild(bg)
  return bg
}
async function modalTolak(pesertaId) {
  modal(`<h2>Tolak pengalihan?</h2>
    <p style="color:var(--ink6);margin-bottom:16px">Agenda akan kembali ke sekretaris untuk diputuskan ulang.</p>
    <form data-form="tolak" data-id="${pesertaId}">
      <div class="field"><label class="label">Alasan (opsional)</label><textarea name="alasan" rows="2"></textarea></div>
      <div style="display:flex;gap:12px">
        <button type="button" class="btn outline" style="flex:1" data-act="tutup-modal">Kembali</button>
        <button class="btn danger-solid" style="flex:1">Tolak</button></div>
    </form>`)
}
async function modalPaksa(agendaId) {
  const peng = await api('/users/pengganti')
  modal(`<h2>Paksa titik</h2>
    <p style="color:var(--ink6);margin-bottom:16px">Rantai mentok. Tetapkan pemegang baru secara paksa.</p>
    <form data-form="paksa" data-id="${agendaId}">
      <div class="field"><label class="label">Pilih user</label>
        <select name="user" required><option value="">— pilih —</option>
        ${peng.map(p => `<option value="${p.id}">${esc(p.nama)} (${esc(p.role)})</option>`).join('')}</select></div>
      <div style="display:flex;gap:12px">
        <button type="button" class="btn outline" style="flex:1" data-act="tutup-modal">Batal</button>
        <button class="btn" style="flex:1">Paksa</button></div>
    </form>`)
}

// ---------- actions ----------
document.addEventListener('click', async (e) => {
  if (e.target.closest('input.sel-ag, input.sel-all')) return // checkbox tidak ikut navigasi baris
  const nav = e.target.closest('[data-nav]')
  if (nav) {
    if (nav.dataset.nav === 'back') { history.back(); return }
    location.hash = nav.dataset.nav
    return
  }
  const el = e.target.closest('[data-act]')
  if (!el) return
  const { act, id, v, agenda: agId } = el.dataset
  try {
    if (act === 'logout') { await api('/logout', { method: 'POST' }); me = null; location.hash = '#/login' }
    else if (act === 'filter') { listFilter = v; vAgendaList() }
    else if (act === 'notif-seg') { notifSeg = v; vNotifikasi() }
    else if (act === 'hadir') {
      await api(`/agenda/peserta/${id}/hadir`, { method: 'POST' })
      toast('Terima kasih, kehadiran tercatat'); route()
    } else if (act === 'alih') location.hash = `#/agenda/peserta/${id}/alih`
    else if (act === 'tolak') modalTolak(id)
    else if (act === 'paksa') modalPaksa(id)
    else if (act === 'kirim-notif') {
      const r = await api(`/agenda/${id}/notif`, { method: 'POST' })
      toast(`Notif terkirim ke ${r.n} peserta`)
    }
    else if (act === 'kirim') {
      const d = await api('/agenda/' + id)
      if (!d.chain.length) return toast('Pilih peserta dulu lewat Edit Agenda', true)
      await api(`/agenda/${id}/kirim`, { method: 'POST', body: JSON.stringify({ peserta: d.chain.map(c => c.user_id) }) })
      toast('Agenda terkirim'); route()
    }
    else if (act === 'batal') {
      if (!confirm('Batalkan agenda ini? Tindakan tidak bisa dibatalkan.')) return
      await api(`/agenda/${id}/batal`, { method: 'POST' })
      toast('Agenda dibatalkan'); route()
    }
    else if (act === 'hapus-sel') {
      if (!delSel.size) return
      if (!confirm(`Hapus ${delSel.size} agenda? Tindakan tidak bisa dibatalkan.`)) return
      const r = await api('/agenda/hapus', { method: 'POST', body: JSON.stringify({ ids: [...delSel].map(Number) }) })
      toast(`Dihapus ${r.n} agenda`); delSel = new Set(); route()
    }
    else if (act === 'simpan-draft') {
      const f = el.closest('form')
      submitAgenda(f, false).catch((err) => toast(err.message, true))
    }
    else if (act === 'tutup-buat') { history.length > 1 ? history.back() : (location.hash = '#/agenda') }
    else if (act === 'tutup-modal') el.closest('.modal-bg').remove()
    else if (act === 'buka-notif') {
      await api(`/notifikasi/${id}/baca`, { method: 'POST' })
      location.hash = `#/agenda/${agId}`
    }
    else if (act === 'baca-semua') { await api('/notifikasi/baca-semua', { method: 'POST' }); route() }
    else if (act === 'tambah-user') $('#form-user').hidden = !$('#form-user').hidden
    else if (act === 'hapus-user') {
      if (!confirm('Hapus user ini?')) return
      await api('/users/' + id, { method: 'DELETE' })
      toast('User dihapus'); vPengguna()
    }
    else if (act === 'ubah-status') {
      // ditangani listener 'change' global di bawah
    }
  } catch (err) { toast(err.message, true) }
})

document.addEventListener('change', async (e) => {
  const selAll = e.target.closest('input.sel-all')
  if (selAll) {
    document.querySelectorAll('input.sel-ag').forEach(c => { c.checked = selAll.checked; selAll.checked ? delSel.add(c.value) : delSel.delete(c.value) })
    updDelBtn(); return
  }
  const sel = e.target.closest('input.sel-ag')
  if (sel) { sel.checked ? delSel.add(sel.value) : delSel.delete(sel.value); updDelBtn(); return }
  const el = e.target.closest('select[data-act="ubah-status"]')
  if (!el) return
  try {
    await api('/users/' + el.dataset.id, { method: 'PUT', body: JSON.stringify({ status: el.value }) })
    toast('Status diubah')
  } catch (err) { toast(err.message, true) }
})

function updDelBtn() {
  const b = $('#del-btn')
  if (b) { b.hidden = delSel.size === 0; b.textContent = `Hapus (${delSel.size})` }
}

async function submitAgenda(f, kirim) {
  const data = Object.fromEntries(new FormData(f).entries())
  const peserta = [...f.querySelectorAll('input[name="peserta"]:checked')].map(i => +i.value)
  if (kirim && peserta.length === 0) return toast('Pilih minimal satu peserta sebelum kirim', true)
  const fid = f.dataset.id
  if (fid) await api('/agenda/' + fid, { method: 'PUT', body: JSON.stringify({ ...data, peserta }) })
  else await api('/agenda', { method: 'POST', body: JSON.stringify({ ...data, peserta, kirim }) })
  toast(kirim ? 'Agenda terkirim ke peserta' : 'Draft tersimpan')
  location.hash = '#/agenda'
}
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]')
  if (!f) return
  e.preventDefault()
  window.Capacitor?.Plugins?.Keyboard?.hide?.() // APK: WebView kadang bandel walau sudah blur
  // tutup soft keyboard: blur + readonly-trick (Android Chrome bandel; activeElement belum tentu input)
  const inputs = f.querySelectorAll('input, textarea')
  inputs.forEach(i => { i.readOnly = true; i.blur() })
  setTimeout(() => inputs.forEach(i => { i.readOnly = false }), 150)
  const kind = f.dataset.form
  try {
    if (kind === 'login') {
      me = await api('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(f))) })
      location.hash = me.must_change ? '#/ganti-password' : '#/'
      setupPush()
    } else if (kind === 'ganti-password') {
      await api('/change-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(f))) })
      me.must_change = false
      toast('Password diperbarui'); location.hash = '#/'
    } else if (kind === 'simpan-agenda') {
      submitAgenda(f, true)
    } else if (kind === 'alih') {
      const d = Object.fromEntries(new FormData(f))
      await api(`/agenda/peserta/${f.dataset.id}/alih`, { method: 'POST', body: JSON.stringify({ pengganti_id: +d.pengganti, alasan: d.alasan }) })
      toast('Tugas dialihkan'); location.hash = '#/'
    } else if (kind === 'tolak') {
      const d = Object.fromEntries(new FormData(f))
      await api(`/agenda/peserta/${f.dataset.id}/tolak`, { method: 'POST', body: JSON.stringify({ alasan: d.alasan }) })
      f.closest('.modal-bg').remove()
      toast('Pengalihan ditolak, agenda kembali ke sekretaris'); route()
    } else if (kind === 'paksa') {
      const d = Object.fromEntries(new FormData(f))
      await api(`/agenda/${f.dataset.id}/paksa`, { method: 'POST', body: JSON.stringify({ user_id: +d.user }) })
      f.closest('.modal-bg').remove()
      toast('Titik paksa ditetapkan'); route()
    } else if (kind === 'user-baru') {
      await api('/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(f))) })
      toast('User dibuat — password awal = username'); vPengguna()
    }
  } catch (err) { toast(err.message, true) }
})

// ---------- push ----------
async function setupPush() {
  try {
    // APK Capacitor: FCM via plugin native (Push API browser tidak jalan di WebView)
    const PN = window.Capacitor?.Plugins?.PushNotifications
    if (PN) {
      const st = await PN.requestPermissions()
      if (!st.granted) return
      PN.addListener('registration', (t) =>
        api('/push/fcm-token', { method: 'POST', body: JSON.stringify({ token: t.value }) }).catch(() => {}))
      PN.addListener('pushNotificationReceived', async () => {
        try { unread = (await api('/notifikasi')).unread; route() } catch (_) { /* best-effort */ }
      })
      PN.register()
      return
    }
    if (!('serviceWorker' in navigator) || localStorage.getItem('push-on')) return
    const reg = await navigator.serviceWorker.register('/sw.js')
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission !== 'granted') return
    const { key } = await api('/push/public-key')
    const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) })
    await api('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) })
    localStorage.setItem('push-on', '1')
  } catch (_) { /* push best-effort */ }
}

// ---------- router ----------
async function route() {
  const h = location.hash || '#/'
  try {
    if (h === '#/login') return vLogin()
    if (!me) { me = await api('/me').catch(() => null); if (!me) { location.hash = '#/login'; return vLogin() } }
    if (me.must_change && h !== '#/ganti-password') { location.hash = '#/ganti-password'; return }
    if (h === '#/ganti-password') return vGantiPassword()
    if (h === '#/') return isDesk() ? vDashboard() : vBeranda()
    if (h === '#/agenda') return vAgendaList()
    const mAlih = h.match(/^#\/agenda\/peserta\/(\d+)\/alih$/)
    if (mAlih) return vAlih(+mAlih[1])
    if (h.startsWith('#/agenda/') && h.endsWith('/edit')) return vBuat(h.split('/')[2])
    if (h.startsWith('#/agenda/')) return vDetail(+h.split('/')[2])
    if (h === '#/buat') return vBuat()
    if (h === '#/pengguna') return isDesk() ? vPengguna() : (location.hash = '#/')
    if (h === '#/notifikasi') return vNotifikasi()
    if (h === '#/profil') return vProfil()
    location.hash = '#/'
  } catch (err) { toast(err.message, true) }
}
window.addEventListener('hashchange', () => {
  document.activeElement?.blur() // keyboard tutup di setiap pindah layar (bukan saat boot/render awal)
  route()
})
// layout switch HANYA saat lewat breakpoint 768px — bukan tiap resize:
// keyboard HP kebuka = viewport ngecil = resize palsu -> route() render ulang -> input hancur -> keyboard nutup sendiri
matchMedia('(min-width: 768px)').addEventListener('change', route)
; (async () => {
  try { me = await api('/me'); unread = (await api('/notifikasi')).unread } catch (_) { me = null }
  route()
  if (me) setupPush() // re-register token FCM tiap buka app (token bisa ganti), bukan cuma saat login
})()
