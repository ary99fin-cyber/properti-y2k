(async () => {
  const box = $("list");
  const { data, error } = await sb.from("properties").select("id,judul,lokasi,status,harga,foto").order("created_at", { ascending: false });
  if (error) { box.textContent = "Data gagal dimuat. Coba muat ulang halaman."; return; }
  if (!data.length) { box.textContent = "Belum ada properti."; return; }
  box.textContent = "";
  data.forEach(p => {
    const a = document.createElement("a");
    a.className = "card"; a.href = "p.html?id=" + p.id;
    a.innerHTML = '<img alt=""><div class="cb"><span class="badge"></span><h3></h3><p class="loc"></p><p class="cp"></p></div>';
    setImg(a.querySelector("img"), (p.foto || [])[0]);
    a.querySelector(".badge").textContent = p.status || "";
    a.querySelector("h3").textContent = p.judul;
    a.querySelector(".loc").textContent = p.lokasi || "";
    a.querySelector(".cp").textContent = rupiah(p.harga);
    box.appendChild(a);
  });
})();
