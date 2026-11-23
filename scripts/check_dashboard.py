# smoke dashboard: mobile beranda (hero + stat klik) & desktop dashboard (stat cards klik)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    pg = b.new_page(viewport={'width': 390, 'height': 844})  # mobile -> vBeranda
    pg.goto('http://127.0.0.1:3000/#/login')
    pg.wait_for_load_state('networkidle')
    pg.fill('#lg-user', 'ujidash')
    pg.fill('#pwd-login', 'uji123')
    pg.click('.btn-block')
    pg.wait_for_timeout(1500)
    print('hash:', pg.evaluate('location.hash'))
    print('hero:', pg.locator('.hero').count())
    sts = pg.locator('.statbar.stat-cards .st')
    print('mobile stat cards:', sts.count(), '| tag:', sts.first.evaluate('e => e.tagName') if sts.count() else '-')
    print('mobile aria:', sts.first.get_attribute('aria-label') if sts.count() else '-')
    print('week aria (desktop-only view, mobile kosong):', pg.locator('.wk-col[aria-label]').count())
    if sts.count():
        sts.first.click()
        pg.wait_for_timeout(900)
        print('mobile nav stlh klik:', '#/agenda' in pg.evaluate('location.hash'))

    pg2 = b.new_page(viewport={'width': 1280, 'height': 800})  # desktop sekper -> vDashboard
    pg2.goto('http://127.0.0.1:3000/#/login')
    pg2.wait_for_load_state('networkidle')
    pg2.fill('#lg-user', 'ujidash')
    pg2.fill('#pwd-login', 'uji123')
    pg2.click('.btn-block')
    pg2.wait_for_timeout(1500)
    dts = pg2.locator('.statbar.stat-cards .st')
    print('desktop stat cards:', dts.count())
    print('desktop aria:', dts.first.get_attribute('aria-label') if dts.count() else '-')
    print('week aria:', pg2.locator('.wk-col[aria-label]').count())
    # donut tanpa hardcode: segmen selesai harus rgb dari --mist
    dots = pg2.locator('.legend .dot').evaluate_all("els => els.map(e => getComputedStyle(e).backgroundColor)")
    print('legend dot colors:', dots)
    if dts.count():
        dts.nth(1).click()
        pg2.wait_for_timeout(900)
        print('desktop nav stlh klik:', '#/agenda' in pg2.evaluate('location.hash'))
    b.close()
print('OK')
