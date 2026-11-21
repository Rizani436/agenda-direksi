/* Agenda Direksi — SPA vanilla, no build step */
const $ = (s) => document.querySelector(s)
const app = $('#app')

let me = null
let unread = 0
let listFilter = 'semua'
let listTerm = ''

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
const fmtT = (s) => String(s || '').slice(0, 5)
const today = () => new Date().toISOString().slice(0, 10)

const IC = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  cal: 'M17 12h-5v5h5v-5zM16 3v2H8V3H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V3h-2z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
}
const svg = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="${IC[k]}"/></svg>`

const chipSt = (st) => {
  const map = {
    menunggu: ['wait', 'Menunggu jawaban'], hadir: ['hadir', 'Hadir'],
    tidak_hadir: ['alih', 'Mengalihkan'], ditolak: ['ditolak', 'Ditolak'],
    draft: ['selesai', 'Draft'], aktif: ['wait', 'Aktif'],
    selesai: ['selesai', 'Selesai'], batal: ['ditolak', 'Batal'],
  }
  const [cls, t] = map[st] || ['selesai', st]
  return `<span class="chip ${cls}">${t}</span>`
}

// ---------- shell ----------
const isDesk = () => window.matchMedia('(min-width: 768px)').matches && me.role === 'sekper'
function shell(content, active) {
  const sbNav = [
    ['#/','Dashboard','home'], ['#/agenda','Agenda','cal'], ['#/buat','Buat Agenda','plus'],
    ['#/pengguna','Pengguna','person'], ['#/notifikasi','Notifikasi','bell'],
  ]
  const bnItems = isDesk() ? [] : me.role === 'sekper'
    ? [['#/','Dashboard','home'],['#/agenda','Agenda','cal'],['#/buat','Buat','plus'],['#/pengguna','Pengguna','person'],['#/notifikasi','Notif','bell']]
    : [['#/','Beranda','home'],['#/agenda','Agenda','cal'],['#/notifikasi','Notifikasi','bell']]
  const side = `<div class="sidebar">
    <div class="brand"><span class="brand-dot"></span>Agenda Direksi</div>
    ${sbNav.map(([h, t, i]) => `<button class="sb-item ${active === t ? 'active' : ''}" data-nav="${h}">${svg(i)}${t}${t === 'Notifikasi' && unread ? `<span class="badge" style="position:static;margin-left:auto">${unread}</span>` : ''}</button>`).join('')}
    <div class="sb-foot"><span class="avatar">${esc(me.nama.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>
      <div style="flex:1"><div style="font-weight:bold">${esc(me.nama)}</div><div class="muted" style="color:var(--ink4);font-size:11px">${esc(me.role)}</div></div>
      <button class="btn sm outline" data-act="logout">Keluar</button></div>
  </div>`
  const bn = `<nav class="bottom-nav">
    ${bnItems.map(([h, t, i]) =>
      `<a class="nav-tab ${(location.hash === h || (h === '#/' && (location.hash === '#/' || location.hash === ''))) ? 'active' : ''}" href="${h}" data-nav="${h}">${svg(i)}${t}${t.includes('Notif') && unread ? `<span class="badge">${unread}</span>` : ''}</a>`).join('')}
  </nav>`
  app.innerHTML = isDesk()
    ? `<div class="shell">${side}<div class="main">${content}</div></div>`
    : `${content}<div class="bottom-nav">${bn}</div>`
}

// ---------- views: auth ----------
function vLogin() {
  app.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <form data-form="login" class="card" style="width:100%;max-width:360px">
      <div class="brand" style="padding:0 0 8px"><span class="brand-dot"></span>Agenda Direksi</div>
      <p class="label" style="margin-bottom:20px">Masuk dengan akun Anda</p>
      <div class="field"><label class="label">Username</label><input name="username" autocomplete="username" required></div>
      <div class="field"><label class="label">Password</label><input name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn" style="width:100%">Masuk</button>
    </form></div>`
}
function vGantiPassword() {
  app.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <form data-form="ganti-password" class="card" style="width:100%;max-width:360px">
      <h1 style="font-size:20px;margin-bottom:6px">Ganti password</h1>
      <p style="color:var(--ink4);font-size:12px;margin-bottom:20px">Password awal = username. Buat password baru untuk lanjut.</p>
      <div class="field"><label class="label">Password baru</label><input name="password" type="password" minlength="6" required></div>
      <button class="btn" style="width:100%">Simpan password</button>
    </form></div>`
}

// ---------- views: sekper ----------
async function vDashboard() {
  const items = await api('/agenda?filter=semua')
  const aktif = items.filter(a => a.status === 'aktif').length
  const menunggu = items.filter(a => a.status === 'aktif' && a.pemegang).length
  const draft = items.filter(a => a.status === 'draft').length
  const recent = items.slice(0, 5)
  shell(`<div class="page-head"><div><h1>Selamat datang, ${esc(me.nama)}</h1>
    <div class="sub">Ringkasan agenda yang Anda kelola</div></div>
    <button class="btn desktop-only" data-nav="#/buat">${svg('plus', 16)}Buat Agenda</button></div>
  <div class="statbar">
    <div class="st"><div class="num">${aktif}</div><div class="lbl">Agenda aktif</div></div>
    <div class="st"><div class="num">${menunggu}</div><div class="lbl">Menunggu jawaban</div></div>
    <div class="st"><div class="num">${draft}</div><div class="lbl">Draft</div></div>
  </div>
  <div class="card">
    <div class="label" style="margin-bottom:12px">Agenda terbaru</div>
    ${recent.length ? recent.map(a => rowAgenda(a, true)).join('') : '<div class="empty"><div class="big">Belum ada agenda</div><div style="margin-top:4px">Buat agenda pertama Anda</div></div>'}
  </div>`, 'Dashboard')
}
function rowAgenda(a, compact = false) {
  return `<button class="agcard" data-nav="#/agenda/${a.id}">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
      <div style="flex:1;min-width:0">
        <div style="font-weight:bold">${esc(a.judul)}</div>
        <div class="meta">${fmtD(a.tanggal)} · ${fmtT(a.jam)}${a.lokasi ? ' · ' + esc(a.lokasi) : ''}</div>
        ${!compact && a.pemegang ? `<div class="meta">Pemegang: ${esc(a.pemegang)}</div>` : ''}
      </div>
      ${a.status === 'draft' ? chipSt('draft') : a.pemegang ? chipSt('menunggu') : chipSt(a.status)}
    </div></button>`
}
async function vAgendaList() {
  const items = await api(`/agenda?filter=${listFilter}&q=${encodeURIComponent(listTerm)}`)
  if (isDesk()) {
    shell(`<div class="page-head"><div><h1>Agenda</h1><div class="sub">Semua agenda yang kamu kelola</div></div>
      <button class="btn" data-nav="#/buat">${svg('plus', 16)}Buat Agenda</button></div>
    <div class="filters">
      ${['semua', 'minggu', 'bulan'].map(f => `<button class="chip ${listFilter === f ? 'on' : ''}" data-act="filter" data-v="${f}">${{ semua: 'Semua', minggu: 'Minggu ini', bulan: 'Bulan ini' }[f]}</button>`).join('')}
      <div class="search">${svg('search', 16)}<input id="q" placeholder="Cari agenda…" value="${esc(listTerm)}"></div>
    </div>
    <div class="card" style="padding:0 20px 4px">
      <table><thead><tr><th>Agenda</th><th>Tanggal</th><th>Pemegang</th><th>Status</th></tr></thead><tbody>
      ${items.map(a => `<tr class="rowlink" data-nav="#/agenda/${a.id}">
        <td><div style="font-weight:bold">${esc(a.judul)}</div>${a.lokasi ? `<div class="muted">${esc(a.lokasi)}</div>` : ''}</td>
        <td class="muted">${fmtD(a.tanggal)}<br>${fmtT(a.jam)}</td>
        <td>${a.pemegang ? esc(a.pemegang) : '<span class="muted">—</span>'}</td>
        <td>${a.status === 'draft' ? chipSt('draft') : a.pemegang ? chipSt('menunggu') : chipSt(a.status)}</td>
      </tr>`).join('') || '<tr><td colspan="4"><div class="empty"><div class="big">Belum ada agenda di filter ini</div></div></td></tr>'}
      </tbody></table></div>`, 'Agenda')
    $('#q').addEventListener('input', (e) => { listTerm = e.target.value; clearTimeout(vAgendaList._t); vAgendaList._t = setTimeout(vAgendaList, 300) })
  } else {
    shell(`<div class="page-head"><div><h1>Agenda Saya</h1><div class="sub">Agenda yang melibatkan Anda</div></div></div>
      ${items.length ? items.map(a => rowAgenda(a)).join('') : '<div class="card empty"><div class="big">Belum ada agenda</div><div style="margin-top:4px">Agenda yang dialihkan ke Anda akan muncul di sini</div></div>'}`, 'Agenda')
  }
}
async function vDetail(id) {
  const { agenda: a, chain: ch, pemegang: pg } = await api('/agenda/' + id)
  const mine = ch.find(c => c.user_id === me.id && c.status === 'menunggu')
  const tlDot = (st) => st === 'hadir' ? 'green' : st === 'menunggu' ? 'hollow' : st === 'ditolak' ? 'red' : 'gray'
  const timeline = ch.map(c => `<div class="tl-item"><span class="tl-dot ${tlDot(c.status)}"></span>
    ${c.waktu_respon ? `<span class="tl-time">${fmtD(c.waktu_respon.slice(0, 10))} · ${c.waktu_respon.slice(11, 16)}</span>` : ''}
    <div style="font-weight:${c.status === 'menunggu' ? 'normal' : 'bold'}">${esc(c.nama)} <span style="color:var(--ink4);font-weight:normal">(${esc(c.role)})</span></div>
    <div class="tl-sub">${{ hadir: 'Hadir', menunggu: 'Menunggu konfirmasi kehadiran', tidak_hadir: `Mengalihkan ke ${esc((ch.find(x => x.id === c.alih_ke_id) || {}).nama || '—')}`, ditolak: 'Menolak pengalihan' }[c.status] || esc(c.status)}</div>
    ${c.alasan ? `<div class="tl-sub">Alasan: ${esc(c.alasan)}</div>` : ''}
  </div>`).join('')

  let actions = ''
  if (isDesk()) {
    actions = `<div style="display:flex;gap:12px">
      ${a.status === 'draft' ? `<button class="btn" data-act="kirim" data-id="${a.id}">Kirim Agenda</button>` : ''}
      <button class="btn outline" data-nav="#/agenda/${a.id}/edit">Edit Agenda</button>
      ${a.status === 'aktif' ? `<button class="btn danger" data-act="batal" data-id="${a.id}">Batalkan</button>` : ''}
      ${a.status === 'aktif' && !pg ? `<button class="btn" data-act="paksa" data-id="${a.id}">Paksa Titik</button>` : ''}
    </div>`
  } else if (mine) {
    actions = `<div class="card" style="display:flex;gap:12px">
      <button class="btn" style="flex:1;background:var(--green)" data-act="hadir" data-id="${mine.id}">Hadir</button>
      <button class="btn danger" style="flex:1" data-act="alih" data-id="${mine.id}">Tidak dapat hadir</button>
    </div>`
  }
  shell(`<div class="page-head">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <button class="btn outline desktop-only" style="min-height:44px;width:44px;padding:0" data-nav="#/agenda">${svg('back', 20)}</button>
      <div><h1 style="font-size:22px">${esc(a.judul)}</h1>
      <div class="sub">${fmtD(a.tanggal)} · ${fmtT(a.jam)} WIB${a.lokasi ? ' · ' + esc(a.lokasi) : ''}</div></div>
    </div>${isDesk() ? actions : ''}</div>
  ${!isDesk() && actions}
  <div class="card">
    <div class="label" style="margin-bottom:12px">Pemegang aktif</div>
    ${pg ? `<div style="display:flex;align-items:center;gap:12px">
      <span class="avatar">${esc(pg.nama.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>
      <div style="flex:1"><div style="font-weight:bold">${esc(pg.nama)}</div><div style="color:var(--ink4);font-size:12px">${esc(pg.role)}</div></div>
      ${chipSt('menunggu')}</div>`
      : `<div style="color:var(--red);font-weight:bold">Rantai mentok — tidak ada pemegang aktif</div>
         <div style="color:var(--ink4);font-size:12px;margin-top:4px">Semua penerima sudah menjawab / menolak. Paksa titik ke user lain atau batalkan agenda.</div>`}
    <div style="border-top:1px solid var(--line);margin:16px 0"></div>
    <div style="display:flex;gap:32px">
      <div><div class="label">Tanggal & Waktu</div><div style="margin-top:4px">${fmtD(a.tanggal)} · ${fmtT(a.jam)} WIB</div></div>
      <div><div class="label">Lokasi</div><div style="margin-top:4px">${esc(a.lokasi || '—')}</div></div>
    </div>
    ${a.catatan ? `<div style="border-top:1px solid var(--line);margin:16px 0"></div><div class="label">Catatan</div><div style="margin-top:4px;color:var(--ink6)">${esc(a.catatan)}</div>` : ''}
  </div>
  <div class="timeline-wrap"><div class="label" style="margin-bottom:4px">Riwayat disposisi</div>
    <div class="timeline">${timeline}</div></div>
  ${a.status === 'draft' && isDesk() ? '<div class="card" style="margin-top:16px;color:var(--ink4)">Draft — belum dikirim ke peserta. Tekan Kirim Agenda untuk mengirim.</div>' : ''}
  `, isDesk() ? 'Agenda' : 'Agenda')
}
async function vBuat(id) {
  const isEdit = !!id
  let a = { pesertaList: [] }
  let terpilih = []
  if (isEdit) {
    const d = await api('/agenda/' + id)
    a = d.agenda
    terpilih = d.chain.map(c => c.user_id)
  }
  const users = (await api('/users')).filter(u => u.status === 'aktif' && u.role !== 'sekper')
  shell(`<div class="page-head"><div style="display:flex;gap:12px;align-items:center">
    <button class="btn outline desktop-only" style="min-height:44px;width:44px;padding:0" data-nav="#/agenda">${svg('back', 20)}</button>
    <div><h1>${isEdit ? 'Edit Agenda' : 'Buat Agenda'}</h1><div class="sub">${isEdit ? esc(a.judul) : 'Isi detail agenda, simpan sebagai draft atau langsung kirim'}</div></div></div></div>
  <form data-form="simpan-agenda" data-id="${id || ''}" class="card">
    <div class="field"><label class="label">Judul agenda</label><input name="judul" required value="${esc(a.judul || '')}"></div>
    <div style="display:flex;gap:12px"><div class="field" style="flex:1"><label class="label">Tanggal</label><input name="tanggal" type="date" required value="${a.tanggal || today()}"></div>
    <div class="field" style="flex:1"><label class="label">Jam</label><input name="jam" type="time" required value="${fmtT(a.jam) || '09:00'}"></div></div>
    <div class="field"><label class="label">Lokasi</label><input name="lokasi" placeholder="Ruang rapat / link Zoom" value="${esc(a.lokasi || '')}"></div>
    <div class="field"><label class="label">Catatan</label><textarea name="catatan" rows="3">${esc(a.catatan || '')}</textarea></div>
    <div class="field"><label class="label">Peserta</label>
      ${users.map(u => `<label class="checkrow"><input type="checkbox" name="peserta" value="${u.id}" ${terpilih.includes(u.id) ? 'checked' : ''}>
        <span style="flex:1"><span style="font-weight:bold">${esc(u.nama)}</span> <span style="color:var(--ink4);font-size:11px">${esc(u.role)}</span></span></label>`).join('')}
    </div>
    <div style="display:flex;gap:12px">
      <button type="button" class="btn outline" data-act="simpan-draft">Simpan</button>
      <button type="submit" class="btn" style="flex:1">Simpan & Kirim</button>
    </div>
  </form>`, isDesk() ? 'Buat Agenda' : '')
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
      <p style="color:var(--ink4);font-size:11px;margin-top:8px">Password awal = username, wajib diganti saat login pertama.</p>
    </form></div>
  <div class="card" style="padding:0 20px 4px">
    <table><thead><tr><th>Nama</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
    ${users.map(u => `<tr>
      <td><div style="font-weight:bold">${esc(u.nama)}</div><div class="muted">${esc(u.username)}${u.push_gagal ? ' · push gagal' : ''}</div></td>
      <td><div class="muted">${esc(u.role)}</div></td>
      <td><select data-act="ubah-status" data-id="${u.id}" style="width:auto;height:32px;padding:4px 10px">
        ${['aktif', 'cuti', 'nonaktif'].map(s => `<option ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td style="text-align:right"><button class="btn sm danger" data-act="hapus-user" data-id="${u.id}">Hapus</button></td>
    </tr>`).join('')}
    </tbody></table></div>`, 'Pengguna')
}

// ---------- views: responder ----------
async function vBeranda() {
  const items = await api('/agenda?filter=semua')
  const naik = items.filter(a => a.tanggal >= today()).sort((x, y) => x.tanggal.localeCompare(y.tanggal))
  const tampil = naik.length ? naik.slice(0, 3) : items.slice(0, 3)
  shell(`<div class="page-head"><div><h1>Halo, ${esc(me.nama.split(' ')[0])}</h1>
    <div class="sub">${naik.length ? `${naik.length} agenda mendatang melibatkan Anda` : 'Terbaru yang melibatkan Anda'}</div></div>
    <button class="btn sm outline" data-act="logout">Keluar</button></div>
  ${tampil.length ? tampil.map(a => `<button class="agcard" data-nav="#/agenda/${a.id}">
    <div style="display:flex;justify-content:space-between;gap:12px">
      <div style="flex:1;min-width:0"><div style="font-weight:bold">${esc(a.judul)}</div>
      <div class="meta">${fmtD(a.tanggal)} · ${fmtT(a.jam)}${a.lokasi ? ' · ' + esc(a.lokasi) : ''}</div>
      ${a.status_saya ? `<div class="row2">${chipSt(a.status_saya)}</div>` : ''}</div>
    </div></button>`).join('')
    : '<div class="card empty"><div class="pill-ico">' + svg('cal', 44) + '</div><div class="big">Belum ada agenda</div><div style="margin-top:4px">Agenda baru dan pengalihan akan muncul di sini</div></div>'}`,
    'Beranda')
}
async function vNotifikasi() {
  const { items, unread: n } = await api('/notifikasi')
  unread = n
  shell(`<div class="page-head"><div><h1>Notifikasi</h1><div class="sub">${n} belum dibaca</div></div>
    ${n ? '<button class="btn sm outline" data-act="baca-semua">Tandai dibaca</button>' : ''}</div>
  <div class="card" style="padding:0">
    ${items.length ? items.map(x => `<button class="notif-item ${x.dibaca ? '' : 'unread'}" data-act="buka-notif" data-id="${x.id}" data-agenda="${x.agenda_id}">
      <div class="t">${{ agenda_baru: 'Agenda baru', alihan: 'Pengalihan agenda', h1: 'Pengingat H-1', h: 'Hari ini', paksa: 'Titik paksa', ditolak: 'Pengalihan ditolak' }[x.tipe]}</div>
      <div class="s">${esc(x.judul)}</div><span class="w">${x.waktu.slice(11, 16)}</span>
    </button>`).join('') : '<div class="empty"><div class="pill-ico">' + svg('bell', 44) + '</div><div class="big">Tidak ada notifikasi</div></div>'}
  </div>`, 'Notifikasi')
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
async function modalAlih(pesertaId) {
  const peng = await api('/users/pengganti')
  const bg = modal(`<h2>Alihkan tugas</h2>
    <form data-form="alih" data-id="${pesertaId}">
      <div class="field"><label class="label">Pilih pengganti</label>
        <select name="pengganti" required><option value="">— pilih —</option>
        ${peng.map(p => `<option value="${p.id}">${esc(p.nama)} (${esc(p.role)})</option>`).join('')}</select></div>
      <div class="field"><label class="label">Alasan (wajib)</label>
        <textarea name="alasan" rows="2" required placeholder="Contoh: bentrok rapat dinas di luar kota"></textarea></div>
      <div style="display:flex;gap:12px">
        <button type="button" class="btn outline" style="flex:1" data-act="tutup-modal">Batal</button>
        <button class="btn" style="flex:1">Alihkan</button></div>
    </form>
    <button type="button" class="btn link danger" data-act="tolak" data-id="${pesertaId}">Tidak bisa juga — tolak tanpa pengganti</button>`)
  return bg
}
async function modalTolak(pesertaId) {
  modal(`<h2>Tolak pengalihan?</h2>
    <p style="color:var(--ink6);margin-bottom:16px">Agenda akan kembali ke sekretaris untuk diputuskan ulang.</p>
    <form data-form="tolak" data-id="${pesertaId}">
      <div class="field"><label class="label">Alasan (opsional)</label><textarea name="alasan" rows="2"></textarea></div>
      <div style="display:flex;gap:12px">
        <button type="button" class="btn outline" style="flex:1" data-act="tutup-modal">Kembali</button>
        <button class="btn danger" style="flex:1">Tolak</button></div>
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
        <button class="btn danger" style="flex:1">Paksa</button></div>
    </form>`)
}

// ---------- actions ----------
document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]')
  if (nav) { location.hash = nav.dataset.nav; return }
  const el = e.target.closest('[data-act]')
  if (!el) return
  const { act, id, v, agenda: agId } = el.dataset
  try {
    if (act === 'logout') { await api('/logout', { method: 'POST' }); me = null; location.hash = '#/login' }
    else if (act === 'filter') { listFilter = v; vAgendaList() }
    else if (act === 'hadir') {
      await api(`/agenda/peserta/${id}/hadir`, { method: 'POST' })
      toast('Terima kasih, kehadiran tercatat'); route()
    } else if (act === 'alih') modalAlih(id)
    else if (act === 'tolak') modalTolak(id)
    else if (act === 'paksa') modalPaksa(id)
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
    else if (act === 'simpan-draft') {
      const f = el.closest('form')
      submitAgenda(f, false).catch((err) => toast(err.message, true))
    }
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
  const el = e.target.closest('select[data-act="ubah-status"]')
  if (!el) return
  try {
    await api('/users/' + el.dataset.id, { method: 'PUT', body: JSON.stringify({ status: el.value }) })
    toast('Status diubah')
  } catch (err) { toast(err.message, true) }
})

async function submitAgenda(f, kirim) {
  const data = Object.fromEntries(new FormData(f).entries())
  const peserta = [...f.querySelectorAll('input[name="peserta"]:checked')].map(i => +i.value)
  if (kirim && peserta.length === 0) return toast('Pilih minimal satu peserta sebelum kirim', true)
  const body = JSON.stringify({ ...data, peserta, kirim })
  const fid = f.dataset.id
  if (fid) await api('/agenda/' + fid, { method: 'PUT', body: JSON.stringify({ ...data, peserta }) })
  else await api('/agenda', { method: 'POST', body })
  toast(kirim ? 'Agenda terkirim ke peserta' : 'Draft tersimpan')
  location.hash = '#/agenda'
}
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]')
  if (!f) return
  e.preventDefault()
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
      f.closest('.modal-bg').remove()
      toast('Tugas dialihkan'); route()
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
    if (h.startsWith('#/agenda/') && h.endsWith('/edit')) return vBuat(h.split('/')[2])
    if (h.startsWith('#/agenda/')) return vDetail(+h.split('/')[2])
    if (h === '#/buat') return vBuat()
    if (h === '#/pengguna') return isDesk() ? vPengguna() : (location.hash = '#/')
    if (h === '#/notifikasi') return vNotifikasi()
    location.hash = '#/'
  } catch (err) { toast(err.message, true) }
}
window.addEventListener('hashchange', route)
window.addEventListener('resize', () => { clearTimeout(route._t); route._t = setTimeout(route, 200) })
if (me) route()
; (async () => {
  try { me = await api('/me'); unread = (await api('/notifikasi')).unread } catch (_) { me = null }
  route()
})()
