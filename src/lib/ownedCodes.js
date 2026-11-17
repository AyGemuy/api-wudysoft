/** Menyimpan id snippet yang dibuat di browser ini (hanya pemilik yang melihat tombol hapus) + suara like/dislike. */
const OWN = 'wudysoft_owned_codes';
const VOTE = 'wudysoft_code_votes';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getOwned = () => read(OWN, []);
export const addOwned = (id) => write(OWN, [...new Set([id, ...getOwned()])].slice(0, 500));
export const removeOwned = (id) => write(OWN, getOwned().filter((x) => x !== id));
export const getVotes = () => read(VOTE, {});
export const setVote = (id, v) => { const all = getVotes(); if (v) all[id] = v; else delete all[id]; write(VOTE, all); };
