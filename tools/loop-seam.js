(function (root) {
  'use strict';
  // Dời điểm đầu/cuối vòng lặp về điểm tín hiệu đi qua 0 theo chiều đi lên gần nhất trong ±20 ms (giảm tiếng "tách" khi lặp).
  function snapLoop(data, sampleRate, start, end) {
    if (!data || data.length < 2 || !sampleRate) return { start, end };
    const rad = Math.floor(0.02 * sampleRate), maxI = data.length - 2;
    const snap = sec => {
      const c = Math.max(0, Math.min(maxI, Math.round(sec * sampleRate)));
      for (let off = 0; off <= rad; off++) {
        for (const i of off ? [c + off, c - off] : [c]) {
          if (i >= 0 && i <= maxI && data[i] <= 0 && data[i + 1] > 0) {
            const t = i / sampleRate;
            if (Math.abs(t - sec) <= 0.02) return t;
          }
        }
      }
      return sec;
    };
    const s = snap(start), e = snap(end);
    return e > s ? { start: s, end: e } : { start, end };
  }
  if (typeof root !== 'undefined') {
    root.snapLoop = snapLoop;
    root.__loopSeam = true;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { snapLoop };
})(typeof window !== 'undefined' ? window : globalThis);
