// Υπολογισμοί: βαθμολογία και πληρωμές.
import { S, played, playerIds, pname } from "./state.js";

const byName = (x, y) => pname(x.p).localeCompare(pname(y.p), "el");

/** Βαθμοί που παίρνει ο νικητής ενός αγώνα: λευκή (ηττημένος στο 0) ή απλή νίκη. */
export function winnerPoints(m) {
  const loser = Math.min(m.sa, m.sb);
  return loser === 0 ? S.shutoutPts : S.winPts;
}

export function standings() {
  const t = {};
  const row = (p) => (t[p] ||= { p, pl: 0, w: 0, l: 0, sh: 0, pf: 0, pa: 0, pts: 0 });
  playerIds().forEach(row);

  S.matches.filter(played).forEach((m) => {
    const A = row(m.a), B = row(m.b);
    A.pl++; B.pl++;
    A.pf += m.sa; A.pa += m.sb;
    B.pf += m.sb; B.pa += m.sa;
    if (m.sa === m.sb) return;
    const [W, L] = m.sa > m.sb ? [A, B] : [B, A];
    W.w++; L.l++;
    W.pts += winnerPoints(m);
    if (Math.min(m.sa, m.sb) === 0) W.sh++;
  });

  return Object.values(t).sort((x, y) =>
    y.pts - x.pts || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf || byName(x, y));
}

export function payments() {
  const t = {};
  const row = (p) => (t[p] ||= { p, played: 0, paid: 0, owed: 0 });
  playerIds().forEach(row);

  S.matches.forEach((m) => {
    [[m.a, m.pa], [m.b, m.pb]].forEach(([p, paid]) => {
      const r = row(p);
      if (paid) r.paid++;
      if (played(m)) { r.played++; if (!paid) r.owed++; }
    });
  });

  return Object.values(t).sort((x, y) => y.owed - x.owed || byName(x, y));
}
