// ================= Fragen pro Bereich =================
// typ: 'text' | 'zahl' | 'ja' (Schalter) | 'wahl' (Auswahl) | 'masse' (mehrere Zahlen nebeneinander)
// wenn: Frage nur zeigen, wenn dieser Schalter an ist
const FRAGEN = {
  raum: [
    { feld: 'name', typ: 'text', label: 'Raumname' },
    { typ: 'masse', felder: [['laenge', 'Länge (m)'], ['breite', 'Breite (m)'], ['hoehe', 'Höhe (m)']] },
    { feld: 'waende', typ: 'ja', label: 'Werden die Wände gemacht?' },
    { feld: 'putz', typ: 'wahl', label: 'Aufbau Wände', wenn: 'waende',
      optionen: [['abrieb', 'Grundputz + Abrieb'], ['grundputz', 'Nur Grundputz']] },
    { feld: 'decke', typ: 'ja', label: 'Wird die Decke gemacht?' },
    { feld: 'ecken', typ: 'zahl', label: 'Wie viele Ecken brauchen Kantenschutz?' },
    { feld: 'dilafugen', typ: 'ja', label: 'Hat es Dilafugen (Anschluss Wand / Decke)?' },
  ],
  fassade: [
    { feld: 'name', typ: 'text', label: 'Bezeichnung' },
    { typ: 'masse', felder: [['laenge', 'Länge / Umfang (m)'], ['hoehe', 'Höhe (m)']] },
    { feld: 'ecken', typ: 'zahl', label: 'Wie viele Hausecken brauchen Kantenschutz?' },
    { feld: 'kapillarschnitt', typ: 'ja', label: 'Hat es einen Kapillarschnitt?' },
    { feld: 'sockel', typ: 'ja', label: 'Hat es einen Sockel?' },
    { feld: 'sockelhoehe', typ: 'zahl', label: 'Sockelhöhe (m)', wenn: 'sockel' },
  ],
  fenster: [
    { feld: 'name', typ: 'text', label: 'Bezeichnung' },
    { feld: 'zuordnung', typ: 'wahl', label: 'Wo ist es?', optionen: () => zuordnungen() },
    { feld: 'art', typ: 'wahl', label: 'Art', optionen: [['fenster', 'Fenster'], ['tuer', 'Türe']] },
    { typ: 'masse', felder: [['breite', 'Breite (m)'], ['hoehe', 'Höhe (m)'], ['anzahl', 'Anzahl']] },
    { feld: 'leibung', typ: 'ja', label: 'Hat es Leibungen?' },
    { feld: 'sturz', typ: 'ja', label: 'Hat es einen Sturz?' },
    { feld: 'gewaende', typ: 'wahl', label: 'Hat es ein Gewände?',
      optionen: [['nein', 'Nein'], ['3', 'Ja – gleiche Länge wie Leibung + Sturz'], ['2', 'Ja – nur zwei Seiten']] },
    { feld: 'ravisol', typ: 'ja', label: 'Hat es Ravisol?' },
    { feld: 'ravisolLaenge', typ: 'zahl', label: 'Ravisol Länge (m)', wenn: 'ravisol' },
  ],
};

// ================= Neue Einträge mit Standardwerten =================
const NEU = {
  raum: (nr) => ({
    id: neueId(), name: `Raum ${nr}`, laenge: '', breite: '', hoehe: '',
    waende: true, putz: 'abrieb', decke: true, ecken: '0', dilafugen: false,
  }),
  fassade: (nr) => ({
    id: neueId(), name: `Fassade ${nr}`, laenge: '', hoehe: '',
    ecken: '0', kapillarschnitt: true, sockel: true, sockelhoehe: '0.30',
  }),
  fenster: (nr) => ({
    id: neueId(), name: `Fenster ${nr}`, zuordnung: '', art: 'fenster',
    breite: '', hoehe: '', anzahl: '1',
    leibung: true, sturz: true, gewaende: 'nein', ravisol: false, ravisolLaenge: '',
  }),
};

const BEREICHE = {
  innen:   { liste: 'raeume',   typ: 'raum',    knopf: '+ Raum',           titel: 'Total Innen' },
  aussen:  { liste: 'fassaden', typ: 'fassade', knopf: '+ Fassade',        titel: 'Total Aussen' },
  fenster: { liste: 'fenster',  typ: 'fenster', knopf: '+ Fenster / Türe', titel: 'Total Fenster & Türen' },
};

const RECHNE = { raum: raumWerte, fassade: fassadeWerte, fenster: oeffnungWerte };

// ================= Berechnungen =================
// Jede Berechnung gibt eine Liste von [Name, Wert, Einheit] zurück

function oeffnungWerte(o) {
  const b = zahl(o.breite);
  const h = zahl(o.hoehe);
  const n = zahl(o.anzahl);

  const leibung = o.leibung ? 2 * h * n : 0; // links + rechts
  const sturz   = o.sturz   ? b * n     : 0; // oben

  let gewaende = 0;
  if (o.gewaende === '3') gewaende = (2 * h + b) * n;
  if (o.gewaende === '2') gewaende = 2 * h * n;

  const kanten = Math.max(leibung + sturz, gewaende);

  return [
    ['Fenster-/Türfläche', b * h * n,                                 'm²'],
    ['Leibung',            leibung,                                   'm'],
    ['Sturz',              sturz,                                     'm'],
    ['Gewände',            gewaende,                                  'm'],
    ['Netzwinkel',         kanten,                                    'm'],
    ['Fensterbank',        o.art === 'fenster' ? b * n : 0,           'm'],
    ['Ravisol',            o.ravisol ? zahl(o.ravisolLaenge) * n : 0, 'm'],
    ['Malerarbeiten',      kanten,                                    'm'],
  ];
}

function raumWerte(r) {
  const l = zahl(r.laenge);
  const b = zahl(r.breite);
  const h = zahl(r.hoehe);
  const ecken  = zahl(r.ecken);
  const umfang = 2 * (l + b);

  // Alle Fenster/Türen, die in diesem Raum sind
  const oeff = summiere(oeffnungenVon(`raum:${r.id}`).map(oeffnungWerte));
  const wand = r.waende ? Math.max(0, umfang * h - wert(oeff, 'Fenster-/Türfläche')) : 0;

  return summiere([
    [
      [r.putz === 'grundputz' ? 'Wand nur Grundputz' : 'Wand Grundputz + Abrieb', wand, 'm²'],
      ['Deckenfläche',  r.decke ? l * b : 0,                                      'm²'],
      ['Kantenschutz',  ecken * h + wert(oeff, 'Leibung') + wert(oeff, 'Sturz'), 'm'],
      ['Eckenzuschlag', ecken * 0.20 * h,                                         'm²'],
      ['Dilafugen',     r.dilafugen ? umfang : 0,                                 'm'],
    ],
    ohneFlaeche(oeff),
  ]);
}

function fassadeWerte(f) {
  const l = zahl(f.laenge);
  const h = zahl(f.hoehe);
  const ecken   = zahl(f.ecken);
  const sockelH = f.sockel ? zahl(f.sockelhoehe) : 0;

  const oeff    = summiere(oeffnungenVon(`fassade:${f.id}`).map(oeffnungWerte));
  const fassade = Math.max(0, l * (h - sockelH) - wert(oeff, 'Fenster-/Türfläche'));

  return summiere([
    [
      ['Fassadenfläche',      fassade,                      'm²'],
      ['Sockel',              l * sockelH,                  'm²'],
      ['Netz Sockel',         l * sockelH,                  'm²'],
      ['Sockelschiene',       f.sockel ? l : 0,             'm'],
      ['Tropfkantenprofil',   f.sockel ? l : 0,             'm'],
      ['Kapillarschnitt',     f.kapillarschnitt ? l : 0,    'm'],
      ['Kantenschutz aussen', ecken * h,                    'm'],
    ],
    ohneFlaeche(oeff),
  ]);
}

// ================= Hilfsfunktionen =================
function zahl(text) {
  return parseFloat(String(text ?? '').replace(',', '.')) || 0; // erlaubt 0,20 und 0.20
}

function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Mehrere Listen zusammenzählen (gleiche Namen werden addiert)
function summiere(listen) {
  const summen = new Map();
  listen.flat().forEach(([name, wert, einheit]) => {
    const bisher = summen.get(name) || [name, 0, einheit];
    bisher[1] += wert;
    summen.set(name, bisher);
  });
  return [...summen.values()];
}

function wert(liste, name) {
  return liste.find(([n]) => n === name)?.[1] || 0;
}

function ohneFlaeche(liste) {
  return liste.filter(([name]) => name !== 'Fenster-/Türfläche');
}

function oeffnungenVon(ziel) {
  return aktuellesProjekt.fenster.filter(o => o.zuordnung === ziel);
}

// Auswahl "Wo ist es?" für Fenster
function zuordnungen() {
  return [
    ['', '– bitte wählen –'],
    ...aktuellesProjekt.raeume.map(r => [`raum:${r.id}`, `Innen: ${r.name}`]),
    ...aktuellesProjekt.fassaden.map(f => [`fassade:${f.id}`, `Aussen: ${f.name}`]),
  ];
}

// Liste von [Name, Wert, Einheit] als Ergebnis-Zeilen anzeigen (nur Werte > 0)
function ergebnisHtml(werte) {
  return werte
    .filter(([, wert]) => wert > 0)
    .map(([name, wert, einheit]) => `
      <div class="ergebnis-zeile">
        <span>${name}</span>
        <strong>${wert.toFixed(2)} ${einheit}</strong>
      </div>`)
    .join('');
}

// ================= Speichern / Laden =================
const SPEICHER_NAME = 'gipma-projekte';

let projekte = laden();
let aktuellesProjekt = null;

function laden() {
  try {
    const daten = localStorage.getItem(SPEICHER_NAME) || localStorage.getItem('gipser-projekte');
    return JSON.parse(daten) || [];
  } catch {
    return [];
  }
}

function speichern() {
  localStorage.setItem(SPEICHER_NAME, JSON.stringify(projekte));
}

// ================= Elemente =================
const startseite   = document.getElementById('startseite');
const projektseite = document.getElementById('projektseite');
const form         = document.getElementById('neuesProjektForm');
const nameInput    = document.getElementById('projektName');
const liste        = document.getElementById('projektListe');
const titel        = document.getElementById('projektTitel');
const container    = document.getElementById('positionen');

// ================= Startseite =================
document.getElementById('neuesProjektBtn').addEventListener('click', () => {
  form.classList.remove('versteckt');
  nameInput.focus();
});

document.getElementById('abbrechenBtn').addEventListener('click', () => {
  form.reset();
  form.classList.add('versteckt');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  const projekt = {
    id: Date.now(),
    name: name,
    erstellt: new Date().toISOString(),
    raeume: [],
    fassaden: [],
    fenster: [],
  };
  projekte.unshift(projekt);
  speichern();

  form.reset();
  form.classList.add('versteckt');
  oeffneProjekt(projekt.id);
});

function zeigeProjektListe() {
  liste.innerHTML = '';

  if (projekte.length === 0) {
    liste.innerHTML = '<p class="leer">Noch keine Projekte.</p>';
    return;
  }

  projekte.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'projekt';

    const name = document.createElement('strong');
    name.textContent = p.name;
    const datum = document.createElement('span');
    datum.textContent = new Date(p.erstellt).toLocaleDateString('de-CH');

    btn.append(name, datum);
    btn.addEventListener('click', () => oeffneProjekt(p.id));
    liste.appendChild(btn);
  });
}

// ================= Projektseite =================
function oeffneProjekt(id) {
  aktuellesProjekt = projekte.find(p => p.id === id);
  // Für ältere Projekte
  aktuellesProjekt.raeume   ||= [];
  aktuellesProjekt.fassaden ||= [];
  aktuellesProjekt.fenster  ||= [];

  titel.textContent = aktuellesProjekt.name;
  startseite.classList.add('versteckt');
  projektseite.classList.remove('versteckt');
  zeigeBereich('innen');
}

document.getElementById('zurueckBtn').addEventListener('click', () => {
  aktuellesProjekt = null;
  projektseite.classList.add('versteckt');
  startseite.classList.remove('versteckt');
  zeigeProjektListe();
});

document.getElementById('loeschenBtn').addEventListener('click', () => {
  if (!confirm(`Projekt "${aktuellesProjekt.name}" wirklich löschen?`)) return;
  projekte = projekte.filter(p => p.id !== aktuellesProjekt.id);
  speichern();
  document.getElementById('zurueckBtn').click();
});

document.querySelectorAll('.tabs button').forEach(tab => {
  tab.addEventListener('click', () => zeigeBereich(tab.dataset.bereich));
});

function zeigeBereich(bereich) {
  document.querySelectorAll('.tabs button').forEach(tab => {
    tab.classList.toggle('aktiv', tab.dataset.bereich === bereich);
  });

  container.innerHTML = '';

  if (bereich === 'total') {
    zeigeTotal();
    return;
  }

  const cfg = BEREICHE[bereich];
  const eintraege = aktuellesProjekt[cfg.liste];

  // Gesamt-Karte oben
  const gesamt = document.createElement('section');
  gesamt.className = 'karte gesamt';
  const aktualisiereGesamt = () => {
    const werte = summiere(eintraege.map(RECHNE[cfg.typ]));
    gesamt.innerHTML = `<h2>${cfg.titel}</h2>`
      + (ergebnisHtml(werte) || '<p class="leer">Noch nichts erfasst.</p>');
  };

  // Alle Einträge (Räume, Fassaden oder Fenster)
  const eintragListe = document.createElement('div');
  eintraege.forEach(obj => {
    eintragListe.appendChild(eintragKarte(obj, cfg, eintraege, aktualisiereGesamt));
  });

  // Knopf für neuen Eintrag
  const neu = document.createElement('button');
  neu.className = 'haupt gross';
  neu.textContent = cfg.knopf;
  neu.addEventListener('click', () => {
    const obj = NEU[cfg.typ](eintraege.length + 1);
    eintraege.push(obj);
    speichern();
    const karte = eintragKarte(obj, cfg, eintraege, aktualisiereGesamt);
    eintragListe.appendChild(karte);
    karte.scrollIntoView({ behavior: 'smooth', block: 'start' });
    aktualisiereGesamt();
  });

  container.append(gesamt, eintragListe, neu);
  aktualisiereGesamt();
}

// Eine Karte mit allen Fragen für einen Raum / eine Fassade / ein Fenster
function eintragKarte(obj, cfg, eintraege, aktualisiereGesamt) {
  const karte = document.createElement('section');
  karte.className = 'karte';

  const ergebnis = document.createElement('div');
  ergebnis.className = 'ergebnis';

  function aktualisiere() {
    // Fragen mit "wenn" nur zeigen, wenn der Schalter an ist
    karte.querySelectorAll('[data-wenn]').forEach(el => {
      el.classList.toggle('versteckt', !obj[el.dataset.wenn]);
    });
    ergebnis.innerHTML = ergebnisHtml(RECHNE[cfg.typ](obj));
    aktualisiereGesamt();
  }

  FRAGEN[cfg.typ].forEach(frage => {
    karte.appendChild(frageElement(frage, obj, () => {
      speichern();
      aktualisiere();
    }));
  });

  const entfernen = document.createElement('button');
  entfernen.className = 'entfernen';
  entfernen.textContent = 'Entfernen';
  entfernen.addEventListener('click', () => {
    if (!confirm(`"${obj.name}" entfernen?`)) return;
    eintraege.splice(eintraege.indexOf(obj), 1);
    speichern();
    karte.remove();
    aktualisiereGesamt();
  });

  karte.append(ergebnis, entfernen);
  aktualisiere();
  return karte;
}

// Baut ein Eingabefeld für eine Frage
function frageElement(frage, obj, beiAenderung) {
  if (frage.typ === 'masse') {
    const zeile = document.createElement('div');
    zeile.className = 'zeile';
    frage.felder.forEach(([feld, label]) => {
      zeile.appendChild(frageElement({ feld, label, typ: 'zahl' }, obj, beiAenderung));
    });
    return zeile;
  }

  const label = document.createElement('label');
  const text = document.createElement('span');
  text.textContent = frage.label;
  let el;

  if (frage.typ === 'ja') {
    label.className = 'check';
    el = document.createElement('input');
    el.type = 'checkbox';
    el.checked = !!obj[frage.feld];
    label.append(el, text);
  } else {
    label.className = 'feld';
    if (frage.typ === 'wahl') {
      el = document.createElement('select');
      const optionen = typeof frage.optionen === 'function' ? frage.optionen() : frage.optionen;
      optionen.forEach(([wert, name]) => el.add(new Option(name, wert)));
    } else {
      el = document.createElement('input');
      el.type = 'text';
      if (frage.typ === 'zahl') el.inputMode = 'decimal';
    }
    el.value = obj[frage.feld] ?? '';
    label.append(text, el);
  }

  if (frage.wenn) label.dataset.wenn = frage.wenn;

  const ereignis = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
  el.addEventListener(ereignis, () => {
    obj[frage.feld] = el.type === 'checkbox' ? el.checked : el.value;
    beiAenderung();
  });

  return label;
}

// ================= Total =================
function zeigeTotal() {
  const p = aktuellesProjekt;
  const bloecke = [
    ['Total Innen',  summiere(p.raeume.map(raumWerte))],
    ['Total Aussen', summiere(p.fassaden.map(fassadeWerte))],
  ];

  // Fenster, die noch keinem Raum / keiner Fassade zugeordnet sind
  const gueltig = zuordnungen().map(([wert]) => wert).filter(Boolean);
  const ohne = p.fenster.filter(o => !gueltig.includes(o.zuordnung));
  if (ohne.length > 0) {
    bloecke.push([`Nicht zugeordnet (${ohne.length} Fenster/Türen)`, summiere(ohne.map(oeffnungWerte))]);
  }

  bloecke.forEach(([ueberschrift, werte], i) => {
    const karte = document.createElement('section');
    karte.className = i === 0 ? 'karte gesamt' : 'karte';
    karte.innerHTML = `<h2>${ueberschrift}</h2>`
      + (ergebnisHtml(werte) || '<p class="leer">Noch nichts erfasst.</p>');
    container.appendChild(karte);
  });
}

// ================= Start =================
zeigeProjektListe();