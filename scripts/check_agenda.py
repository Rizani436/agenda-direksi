# smoke halaman agenda: badge tanggal, group hari, count filter, search, mobile & desktop
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # --- mobile (uji pakai akun direksi: kartu agenda) ---
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.fill('#lg-user', 'ujipicker')
    pg.fill('#pwd-login', 'uji123')
    pg.click('.btn-block')
    pg.wait_for_timeout(1000)
    pg.goto('http://127.0.0.1:3000/#/agenda')
    pg.wait_for_timeout(1200)
    print('count filter:', pg.locator('.fcount').inner_text())
    badges = pg.locator('.tgl-badge')
    print('badge tanggal:', badges.count())
    if badges.count():
        print('badge pertama:', badges.first.inner_text().replace('\n', ' '))
    labels = pg.locator('.label.sec')
    print('group label:', [labels.nth(i).inner_text() for i in range(min(3, labels.count()))])

    # search live
    pg.fill('#q', 'zzz-tidak-ada')
    pg.wait_for_timeout(900)
    print('count stlh cari:', pg.locator('.fcount').inner_text())
    pg.fill('#q', '')
    pg.wait_for_timeout(900)

    # --- desktop (tabel + sorot hari ini) ---
    pg2 = b.new_page(viewport={'width': 1280, 'height': 800})
    pg2.goto('http://127.0.0.1:3000/#/login')
    pg2.wait_for_load_state('networkidle')
    pg2.fill('#lg-user', 'ujisekper')
    pg2.fill('#pwd-login', 'uji123')
    pg2.click('.btn-block')
    pg2.wait_for_timeout(1000)
    pg2.goto('http://127.0.0.1:3000/#/agenda')
    pg2.wait_for_timeout(1200)
    print('desktop tabel:', pg2.locator('.tblcard table').count() == 1)
    print('desktop count:', pg2.locator('.fcount').inner_text())
    print('aria pilih semua:', pg2.locator('.sel-all').get_attribute('aria-label'))
    b.close()
print('OK')
