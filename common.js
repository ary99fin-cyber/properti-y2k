const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const $ = id => document.getElementById(id);
const rupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#cfd6d3"/><text x="50%" y="50%" text-anchor="middle" fill="#5d6b70" font-family="sans-serif" font-size="28">Belum ada foto</text></svg>');
function setImg(el, src) { el.onerror = () => { el.onerror = null; el.src = PLACEHOLDER; }; el.src = src || PLACEHOLDER; }
function parseSpek(t) {
  return (t || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.indexOf(":");
    return i < 0 ? { label: l, nilai: "" } : { label: l.slice(0, i).trim(), nilai: l.slice(i + 1).trim() };
  });
}
