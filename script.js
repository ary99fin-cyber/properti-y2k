const P = PROPERTI;
const $ = id => document.getElementById(id);
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#cfd6d3"/><text x="50%" y="50%" text-anchor="middle" fill="#5d6b70" font-family="sans-serif" font-size="28">Foto belum ditambahkan</text></svg>');
const rupiah = n => "Rp " + Number(n).toLocaleString("id-ID");
let idx = 0;

document.title = P.judul;
$("judul").textContent = P.judul;
$("lokasi").textContent = P.lokasi;
$("status").textContent = P.status;
$("harga").textContent = rupiah(P.harga) + (P.satuanHarga ? " " + P.satuanHarga : "");
$("deskripsi").textContent = P.deskripsi;
$("agen").textContent = "Dipasarkan oleh " + P.agen;

const pesan = encodeURIComponent("Halo, saya tertarik dengan properti: " + P.judul);
const wa = "https://wa.me/" + P.whatsapp + "?text=" + pesan;
$("waBtn").href = wa; $("waBtn2").href = wa;

if (P.petaUrl) { $("peta").href = P.petaUrl; $("petaBlock").hidden = false; }

P.spesifikasi.forEach(s => {
  const d = document.createElement("div");
  d.innerHTML = "<dt></dt><dd></dd>";
  d.children[0].textContent = s.label; d.children[1].textContent = s.nilai;
  $("specs").appendChild(d);
});
P.fasilitas.forEach(f => {
  const li = document.createElement("li"); li.textContent = f; $("fasilitas").appendChild(li);
});

function img(el, src){ el.onerror = () => { el.onerror = null; el.src = PLACEHOLDER; }; el.src = src; }

P.foto.forEach((f, i) => {
  const b = document.createElement("button");
  b.setAttribute("aria-label", f.ket);
  const im = document.createElement("img"); im.alt = f.ket; im.loading = "lazy"; img(im, f.file);
  b.appendChild(im); b.onclick = () => show(i);
  $("thumbs").appendChild(b);
});

function show(i){
  idx = (i + P.foto.length) % P.foto.length;
  const f = P.foto[idx];
  img($("mainImg"), f.file); $("mainImg").alt = f.ket;
  $("cap").textContent = f.ket;
  $("count").textContent = (idx + 1) + " / " + P.foto.length;
  [...$("thumbs").children].forEach((t, k) => t.classList.toggle("on", k === idx));
  $("thumbs").children[idx].scrollIntoView({block:"nearest", inline:"center"});
  if (!$("lb").hidden) { img($("lbImg"), f.file); }
}
$("main").onclick = () => { $("lb").hidden = false; show(idx); };
$("lbClose").onclick = () => $("lb").hidden = true;
$("lbPrev").onclick = () => show(idx - 1);
$("lbNext").onclick = () => show(idx + 1);
document.addEventListener("keydown", e => {
  if ($("lb").hidden) return;
  if (e.key === "Escape") $("lb").hidden = true;
  if (e.key === "ArrowLeft") show(idx - 1);
  if (e.key === "ArrowRight") show(idx + 1);
});
show(0);
