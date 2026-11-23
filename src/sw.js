/* C8: chơi được khi tắt mạng. Mạng trước (bản mới luôn thắng, không làm hỏng Ctrl+F5 / window.VER),
   mất mạng thì lấy bản đã lưu — bỏ qua ?v= nên file lưu ở phiên bản nào cũng dùng được. */
const CACHE = 'nfs-v1';   // trùng tên trong js/ui.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET' || !q.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(q).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.delete(q, { ignoreSearch: true }).then(() => c.put(q, copy))); }   // mỗi file chỉ giữ một phiên bản
    return r;
  }).catch(() => caches.match(q, { ignoreSearch: true }).then(r => r || Response.error())));
});
