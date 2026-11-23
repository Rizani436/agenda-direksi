# smoke picker peserta: login sekper -> buat agenda -> pilih role -> ketik nama -> sugesi -> chip -> submit
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.fill('#lg-user', 'ujipicker'); pg.fill('#pwd-login', 'uji123')
    pg.click('.btn-block')
    pg.wait_for_timeout(1000)
    pg.goto('http://127.0.0.1:3000/#/buat')
    pg.wait_for_load_state('networkidle')
    print('chips awal:', pg.locator('#ps-chips').inner_text())

    pg.select_option('#ps-role', 'direksi')
    pg.fill('#ps-q', 'i')
    pg.wait_for_timeout(300)
    n = pg.locator('.ps-sug-row').count()
    print('sugesi muncul:', n)
    pg.locator('.ps-sug-row').first.click()
    pg.wait_for_timeout(300)
    print('chips setelah pilih:', pg.locator('.chip-ps').count())
    print('hidden peserta:', pg.locator('input[name="peserta"]:checked').count())

    # typo -> pesan tidak cocok
    pg.fill('#ps-q', 'zzz')
    pg.wait_for_timeout(300)
    print('pesan kosong:', pg.locator('#ps-sug').inner_text()[:45])

    # hapus chip
    pg.fill('#ps-q', 'i')
    pg.wait_for_timeout(300)
    pg.locator('.ps-sug-row').first.click(); pg.wait_for_timeout(200)
    c = pg.locator('.chip-ps').count()
    pg.locator('[data-ps-del]').first.click(); pg.wait_for_timeout(200)
    print('chips sebelum/sesudah hapus:', c, pg.locator('.chip-ps').count())

    # hapus semua chip -> submit tanpa peserta -> toast validasi
    pg.locator('[data-ps-del]').last.click()
    pg.wait_for_timeout(200)
    print('chips habis:', pg.locator('.chip-ps').count() == 0)
    pg.fill('input[name="judul"]', 'Uji Picker Tanpa Peserta')
    pg.click('.btn-block')
    pg.wait_for_timeout(600)
    t = pg.locator('.toast')
    print('toast validasi:', t.last.inner_text() if t.count() else '(tidak ada)')
    b.close()
print('OK')
