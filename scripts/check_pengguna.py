# smoke halaman pengguna: sekper -> cari, tambah form, ubah status, edit modal, hapus modal
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.fill('#lg-user', 'ujipicker')
    pg.fill('#pwd-login', 'uji123')
    pg.click('.btn-block')
    pg.wait_for_timeout(1000)
    # buat ujipicker jadi sekper lagi untuk halaman pengguna
    pg.goto('http://127.0.0.1:3000/#/pengguna')
    pg.wait_for_timeout(1200)
    if pg.locator('#pu-body').count() == 0:
        print('BUKAN SEKPER - skip'); b.close(); raise SystemExit

    print('counter awal:', pg.locator('#pu-count').inner_text())
    pg.fill('#pu-q', 'bu')
    pg.wait_for_timeout(250)
    rows = pg.locator('#pu-body tr').count()
    print('baris cari "bu":', rows, '| counter:', pg.locator('#pu-count').inner_text())
    pg.fill('#pu-q', 'zzzz')
    pg.wait_for_timeout(250)
    print('kosong:', pg.locator('#pu-body').inner_text().strip()[:40])
    pg.fill('#pu-q', '')
    pg.wait_for_timeout(250)

    # tambah form: toggle + batal
    pg.click('[data-act="tambah-user"]')
    print('form tampil:', pg.locator('#form-user').is_visible())
    pg.locator('#form-user [data-act="tambah-user"]').click()
    print('form tutup:', pg.locator('#form-user').is_visible())

    # status select terwarna
    print('kelas sel pertama:', pg.locator('.st-sel').first.get_attribute('class'))

    # hapus modal (bukan confirm() native)
    dialogs = []
    pg.on('dialog', lambda d: dialogs.append(d.type) or d.dismiss())
    pg.locator('[data-act="hapus-user"]').first.click()
    pg.wait_for_timeout(400)
    print('native confirm dipakai:', len(dialogs) > 0)
    print('modal hapus tampil:', pg.locator('.modal').count() > 0)
    print('modal teks:', pg.locator('.modal').inner_text()[:60].replace('\n', ' '))
    pg.locator('[data-act="tutup-modal"]').click()

    # edit modal: eye toggle
    pg.locator('[data-act="edit-user"]').first.click()
    pg.wait_for_timeout(500)
    pg.click('.pwd-eye')
    print('eye edit modal:', pg.locator('#ep-pass').get_attribute('type'))
    print('err box ada:', pg.locator('.modal .auth-err').count() == 1)
    b.close()
print('OK')
