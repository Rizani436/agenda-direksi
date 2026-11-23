# smoke detail agenda: head badge, metaCard, CTA urutan, timeline avatar, banner draft, desktop
from playwright.sync_api import sync_playwright

import os
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ID = os.environ['AGENDA_ID']
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.fill('#lg-user', 'ujipicker')
    pg.fill('#pwd-login', 'uji123')
    pg.click('.btn-block')
    pg.wait_for_timeout(1000)
    # detail agenda dengan peserta = ujipicker (menunggu) -> banner + CTA
    pg.goto('http://127.0.0.1:3000/#/agenda/' + ID)
    pg.wait_for_timeout(1200)
    print('badge head:', pg.locator('.det-top .tgl-badge').count())
    print('judul:', pg.locator('.det-judul').first.inner_text()[:30])
    print('chip status:', pg.locator('.mrow .chip').count() == 1)
    print('catatan box:', pg.locator('.catatan').count())
    if pg.locator('.cta-stack').count():
        btns = pg.locator('.cta-stack .btn')
        print('CTA urutan:', [btns.nth(i).inner_text().strip()[:12] for i in range(btns.count())])
        print('Hadir solid:', 'Hadir' in btns.first.inner_text() and 'outline' not in btns.first.get_attribute('class'))
    else:
        print('(bukan pemegang aktif - CTA skip)')
    print('avatar di timeline:', pg.locator('.tl-t .avatar').count())
    print('banner: ', pg.locator('.banner').inner_text()[:40].replace('\n', ' ') if pg.locator('.banner').count() else '(tanpa banner)')
    b.close()
print('OK')
