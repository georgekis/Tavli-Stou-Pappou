// Αυτόματο πρόγραμμα «όλοι με όλους» (μέθοδος κύκλου).
// Με μονό αριθμό παικτών, σε κάθε αγωνιστική ένας έχει ρεπό.

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {string[]} playerIds  οι παίκτες που συμμετέχουν
 * @param {1|2} legs            μονός ή διπλός γύρος
 * @returns {{rounds:{r:number,bye:string}[], matches:{r:number,n:number,a:string,b:string}[], roundsPerLeg:number}}
 */
export function roundRobin(playerIds, legs) {
  const list = shuffle(playerIds);
  if (list.length % 2) list.push(null); // «κενή θέση» = ρεπό
  const n = list.length;
  const roundsPerLeg = n - 1;
  const rounds = [], matches = [];
  let arr = list.slice();

  for (let k = 0; k < roundsPerLeg; k++) {
    const r = k + 1;
    let bye = "", num = 0;
    for (let i = 0; i < n / 2; i++) {
      let a = arr[i], b = arr[n - 1 - i];
      if (a === null || b === null) { bye = a ?? b; continue; }
      if (i === 0 && k % 2) [a, b] = [b, a]; // εναλλαγή για τον «σταθερό» παίκτη
      matches.push({ r, n: ++num, a, b });
    }
    rounds.push({ r, bye });
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]; // περιστροφή
  }

  if (legs === 2) {
    const firstLeg = matches.slice();
    rounds.slice().forEach((x) => rounds.push({ r: x.r + roundsPerLeg, bye: x.bye }));
    firstLeg.forEach((m) => matches.push({ r: m.r + roundsPerLeg, n: m.n, a: m.b, b: m.a }));
  }
  return { rounds, matches, roundsPerLeg };
}
