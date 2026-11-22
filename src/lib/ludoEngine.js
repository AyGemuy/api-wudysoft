/**
 * Mesin Ludo murni (tanpa React/DOM) — papan digambar sendiri oleh halaman /games/ludo,
 * tidak lagi bergantung pada gambar papan dari URL eksternal.
 *
 * Posisi bidak (tersimpan di Ludo.state.pN.{a,b,c,d}):
 *   0        = di kandang
 *   1..51    = jalur utama (1 = petak start milik pemain)
 *   52..56   = lorong menuju rumah (5 petak)
 *   57       = sudah sampai rumah (selesai)
 */
export const FINISH = 57;
export const PIECES = ['a', 'b', 'c', 'd'];

// Jalur 52 petak searah jarum jam, [kolom, baris] pada grid 15×15. Indeks 0 = petak start merah.
export const TRACK = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
];

// 4 kursi di papan: merah (kiri-atas), hijau (kanan-atas), kuning (kanan-bawah), biru (kiri-bawah)
export const SEATS = [
  { id: 'red', name: 'Merah', color: '#ef4444', dark: '#b91c1c', start: 0, quad: [0, 0], home: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]] },
  { id: 'green', name: 'Hijau', color: '#22c55e', dark: '#15803d', start: 13, quad: [9, 0], home: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]] },
  { id: 'yellow', name: 'Kuning', color: '#eab308', dark: '#a16207', start: 26, quad: [9, 9], home: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]] },
  { id: 'blue', name: 'Biru', color: '#3b82f6', dark: '#1d4ed8', start: 39, quad: [0, 9], home: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]] },
];
export const SAFE_TRACK = new Set([0, 13, 26, 39, 8, 21, 34, 47]);

/** Pemain ke-n (1..total) duduk di kursi mana. 2 pemain berhadapan. */
export const seatIndex = (player, total) => ({ 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] }[total] || [0, 1, 2, 3])[player - 1];
export const seatOf = (player, total) => SEATS[seatIndex(player, total)];

export const newState = (total) => {
  const st = {};
  for (let i = 1; i <= 4; i++) st[`p${i}`] = i <= total ? { a: 0, b: 0, c: 0, d: 0 } : null;
  return st;
};

/** Indeks petak jalur utama untuk posisi relatif 1..51, atau -1 bila bukan di jalur utama. */
export const trackIndex = (player, total, rel) => (rel >= 1 && rel <= 51 ? (SEATS[seatIndex(player, total)].start + rel - 1) % 52 : -1);

/** Koordinat pusat (satuan petak, 0..15) sebuah bidak. */
export function cellCenter(player, total, piece, rel) {
  const seat = seatOf(player, total);
  if (rel === 0) {
    const k = PIECES.indexOf(piece);
    return [seat.quad[0] + (k % 2 ? 4 : 2), seat.quad[1] + (k > 1 ? 4 : 2)];
  }
  const cell = rel <= 51 ? TRACK[trackIndex(player, total, rel)] : seat.home[rel - 52];
  return [cell[0] + 0.5, cell[1] + 0.5];
}

export const isFinished = (state, p) => PIECES.every((k) => state[`p${p}`]?.[k] === FINISH);

/** Bidak mana saja yang boleh jalan dengan dadu tertentu. */
export function legalMoves(state, p, dice) {
  const mine = state[`p${p}`];
  if (!mine || !dice) return [];
  return PIECES.filter((k) => {
    const r = mine[k];
    if (r === FINISH) return false;
    if (r === 0) return dice === 6;
    return r + dice <= FINISH;
  });
}

/**
 * Jalankan langkah. Mengembalikan state baru + info: captured (bidak lawan yang termakan),
 * reachedHome, extra (dapat giliran tambahan: dadu 6 / memakan / sampai rumah).
 */
export function applyMove(state, p, piece, dice, total) {
  const next = JSON.parse(JSON.stringify(state));
  const from = next[`p${p}`][piece];
  const to = from === 0 ? 1 : from + dice;
  next[`p${p}`][piece] = to;
  const captured = [];
  const ti = trackIndex(p, total, to);
  if (ti >= 0 && !SAFE_TRACK.has(ti)) {
    for (let q = 1; q <= total; q++) {
      if (q === p) continue;
      for (const k of PIECES) {
        const r = next[`p${q}`][k];
        if (trackIndex(q, total, r) === ti) { next[`p${q}`][k] = 0; captured.push({ p: q, piece: k }); }
      }
    }
  }
  const reachedHome = to === FINISH;
  return { state: next, captured, reachedHome, extra: dice === 6 || captured.length > 0 || reachedHome };
}

/** Giliran berikutnya (melewati pemain yang sudah selesai). 0 bila semua kecuali satu selesai. */
export function nextTurn(state, current, total) {
  for (let i = 1; i <= total; i++) {
    const q = ((current - 1 + i) % total) + 1;
    if (!isFinished(state, q)) return q;
  }
  return current;
}

export const finishedPlayers = (state, total) => Array.from({ length: total }, (_, i) => i + 1).filter((p) => isFinished(state, p));
