# cek visual + smoke login: screenshot login (mobile & desktop), tes error inline, tes loading, tes login sukses
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    # mobile (iPhone-ish viewport, seperti di APK)
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.screenshot(path='shot_login_hp.png')

    # error inline: password salah
    pg.fill('#lg-user', 'dewi')
    pg.fill('#pwd-login', 'salah123')
    pg.click('.btn-block')
    pg.wait_for_timeout(700)
    err = pg.locator('.auth-err')
    print('err text:', err.inner_text())
    pg.screenshot(path='shot_login_error_hp.png')
    print('tombol kembali:', pg.locator('.btn-block').inner_text(), '| disabled:', pg.locator('.btn-block').is_disabled())

    # sukses login
    pg.fill('#pwd-login', 'dewi')
    pg.click('.btn-block')
    pg.wait_for_timeout(1200)
    print('hash setelah sukses:', pg.url.split('#')[-1])

    # desktop
    pg2 = b.new_page(viewport={'width': 1280, 'height': 800})
    pg2.goto('http://127.0.0.1:3000/api/logout')
    pg2.goto('http://127.0.0.1:3000/#/login')
    pg2.wait_for_load_state('networkidle')
    pg2.screenshot(path='shot_login_desktop.png')
    b.close()
print('OK')
