
'use strict';

// Properti Y2K - Brighton Profile Index
// Mengambil link listing yang tersedia di HTML publik.
// Tidak menggunakan API privat Brighton.

const MAX_HTML = 1000000;
const MAX_REDIRECTS = 5;
const HOSTS = ['brighton.co.id', 'www.brighton.co.id'];

function allowedUrl(value) {
  const u = new URL(value);

  if (
    u.protocol !== 'https:' ||
    !HOSTS.includes(u.hostname) ||
    u.port ||
    u.username ||
    u.password
  ) {
    throw new Error('URL di luar domain Brighton');
  }

  return u;
}

async function fetchBrighton(startUrl) {
  let current = allowedUrl(startUrl);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(current.href, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(12000)
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');

      if (!location) {
        throw new Error('Redirect tanpa alamat tujuan');
      }

      current = allowedUrl(new URL(location, current).href);
      continue;
    }

    if (!response.ok) {
      throw new Error('Brighton HTTP ' + response.status);
    }

    const type = response.headers.get('content-type') || '';

    if (!type.toLowerCase().includes('text/html')) {
      throw new Error('Respons Brighton bukan HTML');
    }

    const length = Number(
      response.headers.get('content-length') || 0
    );

    if (length > MAX_HTML) {
      throw new Error('Halaman Brighton terlalu besar');
    }

    const html = (await response.text()).slice(0, MAX_HTML);

    return { html, finalUrl: current.href };
  }

  throw new Error('Terlalu banyak redirect');
}

function findListings(html, baseUrl) {
  const found = new Map();

  // Normalisasi sebagian URL yang di-escape dalam HTML.
  const source = html
    .replace(/&amp;/gi, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/');

  const regex = /(?:href|["']url["'])\s*[=:]\s*["']([^"'<> \t\r\n]+)["']/gi;

  let match;

  while ((match = regex.exec(source)) !== null && found.size < 100) {
    try {
      const link = allowedUrl(new URL(match[1], baseUrl).href);

      if (!/^\/cari-properti\/view\/[^/]+\/?$/.test(link.pathname)) {
        continue;
      }

      link.search = '';
      link.hash = '';

      const slug = decodeURIComponent(
        link.pathname.split('/').filter(Boolean).pop()
      );

      found.set(link.href, {
        url: link.href,
        title: slug.replace(/-/g, ' ').slice(0, 150),
        location: ''
      });
    } catch {
      // Lewati tautan yang tidak valid.
    }
  }

  return Array.from(found.values());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  let profileUrl;

  try {
    profileUrl = allowedUrl(req.query.url);

    if (
      !/^\/[A-Za-z0-9_-]+\/?$/.test(profileUrl.pathname) ||
      profileUrl.search ||
      profileUrl.hash
    ) {
      throw new Error('Bukan halaman profil');
    }
  } catch {
    return res.status(400).json({
      error: 'URL profil Brighton tidak valid'
    });
  }

  try {
    const result = await fetchBrighton(profileUrl.href);

    const listings = findListings(
      result.html,
      result.finalUrl
    );

    return res.status(200).json({
      success: true,
      profile: profileUrl.href,
      listings,
      total: listings.length,
      note: listings.length
        ? 'Link yang terlihat di HTML berhasil ditemukan. Hasil mungkin belum lengkap.'
        : 'Profil terbaca, tetapi belum ditemukan link listing dalam HTML awal. Brighton mungkin memuat listing secara dinamis.'
    });

  } catch (err) {
    console.error('BRIGHTON FETCH ERROR:', {
      message: err.message,
      cause: err.cause?.message,
      code: err.cause?.code
    });

    return res.status(502).json({
      success: false,
      error: 'Tidak bisa membaca profil Brighton: ' + err.message
    });
  }
};
