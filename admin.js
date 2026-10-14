let editId = null, fotos = [], removed = [];
const show = login => { $("loginBox").hidden = !login; $("panel").hidden = login; };
const namaFile = u => decodeURIComponent(new URL(u).pathname.split("/").pop());

function kompres(file, maks = 1600) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const k = Math.min(1, maks / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(u); b ? res(b) : rej(new Error("Foto gagal diproses")); }, "image/jpeg", 0.82);
    };
    im.onerror = () => rej(new Error("Foto tidak terbaca"));
    im.src = u;
  });
}

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  show(!session); if (session) muatList();
})();

$("loginForm").onsubmit = async e => {
  e.preventDefault(); $("loginErr").textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: $("email").value, password: $("pass").value });
  if (error) { $("loginErr").textContent = "Email atau password salah."; return; }
  show(false); muatList();
};
$("logout").onclick = async () => { await sb.auth.signOut(); show(true); };

async function muatList() {
  const { data, error } = await sb.from("properties").select("*").order("created_at", { ascending: false });
  const box = $("rows"); box.textContent = "";
  if (error) { box.textContent = "Gagal memuat: " + error.message; return; }
  if (!data.length) { box.textContent = "Belum ada properti."; return; }
  data.forEach(p => {
    const r = document.createElement("div"); r.className = "row";
    r.innerHTML = '<img alt=""><div class="rt"><b></b><small></small></div><div class="ra"><a class="ghost" target="_blank">Lihat</a><button class="ghost e">Edit</button><button class="ghost d">Hapus</button></div>';
    setImg(r.querySelector("img"), (p.foto || [])[0]);
    r.querySelector("b").textContent = p.judul; r.querySelector("small").textContent = rupiah(p.harga);
    r.querySelector("a").href = "p.html?id=" + p.id;
    r.querySelector(".e").onclick = () => isiForm(p);
    r.querySelector(".d").onclick = async () => {
      if (!confirm("Hapus properti ini beserta fotonya?")) return;
      const { error: delError } = await sb.from("properties").delete().eq("id", p.id);
      if (delError) { alert("Gagal menghapus: " + delError.message); return; }
      if ((p.foto || []).length) await sb.storage.from("foto").remove(p.foto.map(namaFile));
      muatList();
    };
    box.appendChild(r);
  });
}

function renderFotos() {
  const box = $("fotos"); box.textContent = "";
  fotos.forEach((u, i) => {
    const d = document.createElement("div"); d.className = "ft";
    d.innerHTML = '<img alt=""><button type="button" class="x1" aria-label="Hapus foto">×</button>' + (i ? '<button type="button" class="u1">Jadikan utama</button>' : '<span class="u1">Utama</span>');
    setImg(d.querySelector("img"), u);
    d.querySelector(".x1").onclick = () => { removed.push(u); fotos.splice(i, 1); renderFotos(); };
    const b = d.querySelector("button.u1"); if (b) b.onclick = () => { fotos.unshift(fotos.splice(i, 1)[0]); renderFotos(); };
    box.appendChild(d);
  });
}

function resetForm() {
  editId = null; fotos = []; removed = []; $("form").reset();
  $("formTitle").textContent = "Tambah properti"; $("batal").hidden = true; renderFotos();
}
function isiForm(p) {
  editId = p.id; fotos = [...(p.foto || [])]; removed = [];
  $("f_judul").value = p.judul || ""; $("f_lokasi").value = p.lokasi || ""; $("f_status").value = p.status || "Dijual";
  $("f_harga").value = p.harga || ""; $("f_spek").value = p.spesifikasi || ""; $("f_desk").value = p.deskripsi || ""; $("f_fas").value = p.fasilitas || "";
  $("formTitle").textContent = "Edit properti"; $("batal").hidden = false; $("msg").textContent = "";
  renderFotos(); $("form").scrollIntoView({ behavior: "smooth" });
}
$("batal").onclick = resetForm;

$("form").onsubmit = async e => {
  e.preventDefault(); const btn = $("simpan"); btn.disabled = true; $("msg").textContent = "Menyimpan...";
  try {
    const files = [...$("files").files];
    for (let i = 0; i < files.length; i++) {
      $("msg").textContent = "Mengunggah foto " + (i + 1) + " dari " + files.length + "...";
      const blob = await kompres(files[i]);
      const path = crypto.randomUUID() + ".jpg";
      const { error } = await sb.storage.from("foto").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      fotos.push(sb.storage.from("foto").getPublicUrl(path).data.publicUrl);
    }
    const row = {
      judul: $("f_judul").value.trim(), lokasi: $("f_lokasi").value.trim(), status: $("f_status").value,
      harga: Number($("f_harga").value || 0), spesifikasi: $("f_spek").value, deskripsi: $("f_desk").value,
      fasilitas: $("f_fas").value, foto: fotos
    };
    const { error } = editId ? await sb.from("properties").update(row).eq("id", editId) : await sb.from("properties").insert(row);
    if (error) throw error;
    if (removed.length) await sb.storage.from("foto").remove(removed.map(namaFile));
    resetForm(); $("files").value = ""; $("msg").textContent = "Tersimpan."; muatList();
  } catch (err) { $("msg").textContent = "Gagal: " + (err.message || err); }
  btn.disabled = false;
};
