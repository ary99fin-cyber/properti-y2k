// Mesin video slideshow properti — murni canvas 2D, tanpa dependensi.
// drawFrame(c, tl, t) menggambar satu frame pada detik ke-t, jadi sama persis untuk preview & rekaman.

export const STYLES = {
  elegan:  { label: 'Elegan',  sub: 'Pelan & mewah',   dur: 3.2, tr: 0.8,  flash: 0,   delay: 1,
             trans: ['fade', 'zoom', 'fade', 'slide'] },
  dinamis: { label: 'Dinamis', sub: 'Seimbang, variatif', dur: 2.6, tr: 0.55, flash: 0.16, delay: 0.8,
             trans: ['slide', 'zoom', 'wipe', 'up', 'zoom'] },
  cepat:   { label: 'Cepat',   sub: 'Energik untuk TikTok', dur: 1.8, tr: 0.35, flash: 0.24, delay: 0.6,
             trans: ['wipe', 'slide', 'up', 'zoom'] },
};
export const OUTRO = 3;
const MOTIONS = ['in', 'out', 'left', 'right', 'up', 'in', 'down'];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 };
const easeBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) };
const seg = (t, t0, d) => clamp((t - t0) / d);

function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
function wrap(c, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (c.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l + '…' }
  return lines;
}

// info: {status,title,loc,price,chips[],agen,wa,accent,serif,sans}; imgs: foto utama (≥1); agentImg opsional.
export function buildTimeline({ W, H, info, imgs, agentImg, style = 'dinamis', c }) {
  const S = STYLES[style] || STYLES.dinamis, s = W / 1080, px = n => Math.round(n * s);
  const slides = []; let start = 0;
  imgs.forEach((img, i) => {
    if (i > 0) start += slides[i - 1].dur - S.tr;
    slides.push({ kind: 'photo', img, dur: S.dur, start, motion: MOTIONS[(i * 3 + (style === 'cepat' ? 1 : 0)) % MOTIONS.length], trans: i ? S.trans[(i - 1) % S.trans.length] : null });
  });
  const last = slides[slides.length - 1];
  slides.push({ kind: 'outro', dur: OUTRO, start: last.start + last.dur - Math.min(S.tr, .6), trans: 'fade' });
  const outroStart = slides[slides.length - 1].start, total = outroStart + OUTRO;
  // teks (diukur sekali)
  const maxW = W - px(128);
  c.font = `600 ${px(50)}px ${info.serif}`;
  const titleLines = wrap(c, info.title, maxW, 2);
  c.font = `400 ${px(34)}px ${info.sans}`;
  const loc = wrap(c, info.loc, maxW, 1)[0] || '';
  let pricePx = 92; for (; pricePx > 40; pricePx -= 4) { c.font = `700 ${px(pricePx)}px ${info.serif}`; if (c.measureText(info.price).width <= maxW) break }
  c.font = `600 ${px(30)}px ${info.sans}`;
  const chips = []; let used = 0;
  for (const tx of (info.chips || []).slice(0, 3)) { const w = c.measureText(tx).width + px(40); if (used + w > maxW) break; chips.push({ tx, w }); used += w + px(14) }
  return { W, H, s, px, S, style, info, slides, agentImg, outroStart, total, titleLines, loc, pricePx, chips, tr: S.tr };
}

function drawPhoto(c, tl, sl, lt) {
  const { W, H } = tl, u = clamp(lt / sl.dur), e = easeIO(u), img = sl.img;
  let sc = 1.18, ox = 0, oy = 0;
  const A = (sc - 1) * .5;
  if (sl.motion === 'in') sc = 1.04 + .2 * e;
  else if (sl.motion === 'out') sc = 1.24 - .2 * e;
  else {
    const amp = A * .9;
    if (sl.motion === 'left') ox = (e - .5) * 2 * amp * W;
    else if (sl.motion === 'right') ox = (.5 - e) * 2 * amp * W;
    else if (sl.motion === 'up') oy = (e - .5) * 2 * amp * H;
    else oy = (.5 - e) * 2 * amp * H;
  }
  const k = Math.max(W / img.width, H / img.height) * sc, dw = img.width * k, dh = img.height * k;
  c.drawImage(img, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
}

function drawOutro(c, tl, lt) {
  const { W, H, px, info, agentImg, slides } = tl, gold = info.accent, L = W / 2;
  const base = slides[0].img, k = Math.max(W / base.width, H / base.height) * (1.25 + .05 * clamp(lt / 3));
  c.drawImage(base, (W - base.width * k) / 2, (H - base.height * k) / 2, base.width * k, base.height * k);
  c.fillStyle = 'rgba(8,8,9,.8)'; c.fillRect(0, 0, W, H);
  const a = (t0, d = .5) => easeOut(seg(lt, t0, d)), up = (t0, d = .5) => (1 - a(t0, d)) * px(40);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const cy = H * .42;
  if (agentImg) {
    const r = px(150); c.save(); c.globalAlpha = a(.1);
    const sc = .8 + .2 * easeBack(seg(lt, .1, .6)); c.translate(L, cy - px(60)); c.scale(sc, sc);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
    const ak = Math.max(2 * r / agentImg.width, 2 * r / agentImg.height); c.drawImage(agentImg, -agentImg.width * ak / 2, -r, agentImg.width * ak, agentImg.height * ak); c.restore();
    c.save(); c.globalAlpha = a(.1); c.strokeStyle = gold; c.lineWidth = px(5); c.beginPath(); c.arc(L, cy - px(60), r * (.8 + .2 * easeBack(seg(lt, .1, .6))), 0, Math.PI * 2); c.stroke(); c.restore();
  }
  const y0 = cy + px(170);
  c.globalAlpha = a(.35); c.fillStyle = '#fff'; c.font = `700 ${px(62)}px ${info.sans}`; c.fillText(info.agen || '', L, y0 + up(.35));
  c.globalAlpha = a(.5); c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `400 ${px(36)}px ${info.sans}`; c.fillText('Agen Brighton', L, y0 + px(56) + up(.5));
  c.globalAlpha = a(.7); c.fillStyle = gold; c.font = `700 ${px(Math.min(92, tl.pricePx))}px ${info.serif}`; c.fillText(info.price, L, y0 + px(200) + up(.7));
  const bw = px(700), bh = px(110), by = y0 + px(260) + up(.9), sc = .9 + .1 * easeBack(seg(lt, .9, .6));
  c.globalAlpha = a(.9); c.save(); c.translate(L, by + bh / 2); c.scale(sc, sc); c.fillStyle = gold; rrect(c, -bw / 2, -bh / 2, bw, bh, bh / 2); c.fill();
  c.fillStyle = '#000'; c.font = `700 ${px(44)}px ${info.sans}`; c.fillText(`Chat WA ${info.wa}`, 0, px(15)); c.restore();
  c.globalAlpha = a(1.2); c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `400 ${px(32)}px ${info.sans}`; c.fillText('Link lengkap di bio', L, by + bh + px(70));
  c.globalAlpha = 1; c.textAlign = 'left';
}

function drawSlide(c, tl, sl, t) { const lt = t - sl.start; sl.kind === 'photo' ? drawPhoto(c, tl, sl, lt) : drawOutro(c, tl, lt) }

function drawOverlay(c, tl, t) {
  const { W, H, px, info, S, titleLines, chips } = tl, gold = info.accent, L = px(64);
  const fade = 1 - seg(t, tl.outroStart, tl.tr); if (fade <= 0) return;
  c.save(); c.globalAlpha = fade; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  let g = c.createLinearGradient(0, H * .36, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.75, 'rgba(0,0,0,.78)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); c.fillStyle = g; c.fillRect(0, H * .36, W, H * .64);
  g = c.createLinearGradient(0, 0, 0, H * .2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H * .2);
  // badge + brand
  const top = px(215), st = String(info.status || '').toUpperCase(), ea = easeOut(seg(t, .1, .5));
  c.globalAlpha = fade * ea; c.font = `700 ${px(32)}px ${info.sans}`; const bw = c.measureText(st).width + px(52), bh = px(60);
  c.fillStyle = gold; rrect(c, L - (1 - ea) * px(40), top, bw, bh, bh / 2); c.fill(); c.fillStyle = '#000'; c.fillText(st, L + px(26) - (1 - ea) * px(40), top + bh / 2 + px(12));
  c.font = `600 ${px(30)}px ${info.sans}`; c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText('PROPERTI Y2K', W - L, top + bh / 2 + px(11)); c.textAlign = 'left';
  // blok bawah (dihitung dari bawah ke atas, di atas zona UI TikTok/Reels)
  let y = H - px(400); const chipH = px(58), d = S.delay;
  let cx = L;
  chips.forEach(({ tx, w }, i) => {
    const p = easeOut(seg(t, 1.9 * d + i * .45 * d, .45)); c.font = `600 ${px(30)}px ${info.sans}`;
    c.globalAlpha = fade * p; c.fillStyle = 'rgba(255,255,255,.14)'; rrect(c, cx + (1 - p) * px(50), y - chipH, w, chipH, chipH / 2); c.fill();
    c.strokeStyle = gold; c.lineWidth = px(2); c.stroke(); c.fillStyle = '#fff'; c.fillText(tx, cx + px(20) + (1 - p) * px(50), y - chipH / 2 + px(11)); cx += w + px(14);
  });
  y -= chipH + px(44);
  const pl = easeOut(seg(t, 1.4 * d, .5)); c.globalAlpha = fade * pl; c.fillStyle = 'rgba(255,255,255,.88)'; c.font = `400 ${px(34)}px ${info.sans}`;
  c.fillText(tl.loc, L, y + (1 - pl) * px(30)); y -= px(62);
  c.font = `600 ${px(50)}px ${info.serif}`;
  for (let i = titleLines.length - 1; i >= 0; i--) { const p = easeOut(seg(t, .8 * d + (titleLines.length - 1 - i) * .12, .5)); c.globalAlpha = fade * p; c.fillStyle = '#fff'; c.fillText(titleLines[i], L, y + (1 - p) * px(34)); y -= px(60) }
  y -= px(10);
  const pp = easeBack(seg(t, .3, .7)); c.globalAlpha = fade * clamp(pp * 1.4); c.fillStyle = gold; c.font = `700 ${px(tl.pricePx)}px ${info.serif}`;
  c.save(); c.translate(L, y); c.scale(.6 + .4 * pp, .6 + .4 * pp); c.fillText(info.price, 0, 0); c.restore();
  c.restore();
}

export function drawFrame(c, tl, t) {
  const { W, H, slides } = tl; t = clamp(t, 0, tl.total - .001);
  c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  // slide aktif = yang terakhir mulai; jika masih dalam masa transisi, gambar slide sebelumnya di bawah
  let j = 0; for (let i = 0; i < slides.length; i++) if (t >= slides[i].start) j = i;
  const B = slides[j], A = j > 0 ? slides[j - 1] : null, p = A ? easeIO(seg(t, B.start, A.kind === 'photo' ? Math.min(tl.tr, A.dur) : tl.tr)) : 1;
  const tr = B.trans || 'fade';
  if (!A || p >= 1) drawSlide(c, tl, B, t);
  else {
    c.save();
    if (tr === 'slide') { c.translate(-p * W * .35, 0); drawSlide(c, tl, A, t); c.restore(); c.save(); c.translate((1 - p) * W, 0); c.beginPath(); c.rect(0, 0, W, H); c.clip(); drawSlide(c, tl, B, t); }
    else if (tr === 'up') { c.translate(0, -p * H * .25); drawSlide(c, tl, A, t); c.restore(); c.save(); c.translate(0, (1 - p) * H); c.beginPath(); c.rect(0, 0, W, H); c.clip(); drawSlide(c, tl, B, t); }
    else if (tr === 'zoom') { drawSlide(c, tl, A, t); c.restore(); c.save(); const z = 1.35 - .35 * p; c.globalAlpha = p; c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2); drawSlide(c, tl, B, t); }
    else if (tr === 'wipe') { drawSlide(c, tl, A, t); c.restore(); c.save(); const e = p * (W + 240) - 120; c.beginPath(); c.moveTo(0, 0); c.lineTo(e + 120, 0); c.lineTo(e - 120, H); c.lineTo(0, H); c.closePath(); c.clip(); drawSlide(c, tl, B, t); }
    else { drawSlide(c, tl, A, t); c.restore(); c.save(); c.globalAlpha = p; drawSlide(c, tl, B, t); }
    c.restore();
    if (tl.S.flash) { c.fillStyle = `rgba(255,255,255,${tl.S.flash * (1 - p)})`; c.fillRect(0, 0, W, H) }
  }
  c.globalAlpha = 1;
  drawOverlay(c, tl, t);
}
