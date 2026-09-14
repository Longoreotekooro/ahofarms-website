// Design-system QA probe (2026-09-14 audit, plan P10).
//
// Not a Node script: paste this whole file into the DevTools console on any
// page of the running site (e.g. http://localhost:8123/index.html, started
// with `node scripts/dev-server.js`). It replaces the page body with a
// harness, loads every page in same-origin iframes at 1440 / 820 / 390 px,
// and resolves to a JSON object keyed by page -> width with:
//   docH, overflowX, wide[] (elements past the viewport), distinctSizes,
//   fonts[], buttons[] (class|size|weight|radius|height|bg), smallTargets +
//   smallSample (mobile only, hit areas under 36px), palette,
//   paletteViolations + violSample (teal on an earth page or gold on a teal
//   page), h1 count, main landmark, JS errors.
// `copy(JSON.stringify(await probe(), null, 1))` puts the result on the
// clipboard. Keep it in step with the page list in scripts/nav-config.js.
async function probe() {
  const pages = ['index','about','origins','team','tohu','cultivation','quality','products','news','whats-new','contact','kaupapa','social-impact','prescribers','pharmacies','export-partners','board','business','privacy','terms','disclaimer','404','prescribers-portal','pharmacies-portal','export-portal'];
  const widths = [1440, 820, 390];
  const out = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sel = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:#111';
  for (const p of pages) {
    out[p] = {};
    for (const w of widths) {
      const f = document.createElement('iframe');
      f.style.cssText = `width:${w}px;height:900px;border:0;display:block`;
      document.body.appendChild(f);
      const errs = [];
      await new Promise(res => { f.onload = res; f.src = '/' + p + '.html?probe=1'; });
      try { f.contentWindow.addEventListener('error', e => errs.push(String(e.message).slice(0, 80))); } catch (e) {}
      await sleep(900);
      const r = {};
      try {
        const d = f.contentDocument, cw = f.contentWindow;
        const gs = el => cw.getComputedStyle(el);
        const vis = el => { const cs = gs(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
        cw.scrollTo(0, d.documentElement.scrollHeight); await sleep(250); cw.scrollTo(0, 0); await sleep(150);
        r.docH = d.documentElement.scrollHeight;
        r.overflowX = d.documentElement.scrollWidth - w;
        const wide = [];
        for (const el of d.querySelectorAll('body *')) {
          if (['HTML', 'BODY', 'SCRIPT', 'STYLE'].includes(el.tagName)) continue;
          if (!vis(el)) continue;
          const b = el.getBoundingClientRect();
          if (b.right > w + 2 && gs(el).position !== 'fixed' && !el.closest('.plogos-track,.mobile-tabs,[class*=drift]')) { wide.push(sel(el) + ' +' + Math.round(b.right - w)); if (wide.length >= 4) break; }
        }
        r.wide = wide;
        const sizes = new Set(); [...d.querySelectorAll('h1,h2,h3,h4,p,a,li,span,button,label,small')].filter(vis).forEach(e => sizes.add(gs(e).fontSize));
        r.distinctSizes = sizes.size;
        r.fonts = [...new Set([...d.querySelectorAll('h1,h2,h3,p,a,span,li,button,select')].filter(vis).map(e => gs(e).fontFamily.split(',')[0].replace(/"/g, '')))];
        r.buttons = [...d.querySelectorAll('a[class*="btn"],button[class*="btn"]')].filter(vis).filter(e => !e.className.includes('aho-connect') && !e.className.includes('nav-')).slice(0, 4).map(e => { const cs = gs(e); const b = e.getBoundingClientRect(); return [sel(e), cs.fontSize, cs.fontWeight, cs.borderRadius, Math.round(b.height) + 'h', cs.backgroundColor].join('|'); });
        if (w === 390) {
          const small = [...d.querySelectorAll('a,button')].filter(vis).filter(e => { const b = e.getBoundingClientRect(); return b.height < 36 || b.width < 36; });
          r.smallTargets = small.length; r.smallSample = small.slice(0, 5).map(sel);
        }
        r.palette = d.documentElement.getAttribute('data-palette') || 'earth';
        const tealRe = /rgb\((98|115|74|153), (170|168|122|197), (166|165|120|196)\)/, goldRe = /rgb\((201|227|143), (160|200|106), (106|148|51)\)/;
        let viol = 0; const bad = r.palette === 'teal' ? goldRe : tealRe;
        for (const el of [...d.querySelectorAll('body *')].slice(0, 4000)) { if (!vis(el)) continue; const cs = gs(el); if (bad.test(cs.color) || bad.test(cs.backgroundColor) || bad.test(cs.borderTopColor)) { viol++; if (viol <= 3) (r.violSample = r.violSample || []).push(sel(el)); } }
        r.paletteViolations = viol;
        r.h1 = d.querySelectorAll('h1').length; r.main = !!d.querySelector('main'); r.errors = errs;
      } catch (e) { r.err = String(e); }
      out[p][w] = r;
      f.remove();
    }
  }
  return out;
}
