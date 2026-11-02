# Jurnal de modificări — Fabrica

## 2.2.0 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 2.2.0 — 2026-11-01

- Corectat: adaptorul «Trimite la…» nu mai aruncă eroare când kitul FFF lipsește (gardian pe fiecare bloc; găsit de testul «fără kit» din CI).

Nou: «Trimite la…» (fff-kit, modulul FFF.bridge) — după orice export de fișier (GPX, ICS, CSV, Markdown) apare butonul «Trimite la…» către aplicațiile compatibile, iar importul de fișiere al aplicației primește plicuri .fff.json trimise de ele, cu confirmare înainte de import. Fără rețea, fără telemetrie.

## 2.1.0 — 2026-10-27 (anterior: 2.0.1)

- Nou: tip de întrebare **răspuns numeric** (valoare, toleranță ±, unitate opțională; virgulă sau punct zecimal): editor, player, validare, import CSV (`numeric`), normalizare la import. Ordonarea și potrivirea existau deja (7 tipuri → 8).
- Nou: **export SCORM 1.2** (ZIP „store” scris de mână, `imsmanifest.xml` + `index.html`), cu verificarea structurii manifestului la export și adaptor în player (status, scor, suspend_data, session_time, exit). Testat doar cu un API LMS SIMULAT, NU pe un LMS real.
- Nou: 2 șabloane de curs în română („Siguranță online de bază”, „Tehnici de învățare eficientă”), texte generale fără surse bibliografice.
- Punte Undava: întrebările numerice se exportă ca `num` cu toleranță, iar `num` cu toleranță din Undava se importă ca tip numeric (înainte era respins).
- Texte noi în 8 limbi pentru interfața editorului (traducere automată pentru fr/it/es/pt/hu/de); conținutul șabloanelor este doar în română.
- Teste: `tests/v21.test.mjs` (60 de verificări); `tests/test.mjs` (247) și `adaptive` (57) trec.
- Nu s-a făcut: validarea manifestului cu XSD-urile oficiale (neincluse), raportare SCORM per întrebare (cmi.interactions), test pe LMS real (Moodle etc.), tipuri suplimentare de întrebări.

## 2.0.1 — 2026-10-27 (anterior: 2.0.0)
Doar documentare; logica aplicației nu s-a schimbat (doar numărul versiunii).
- README (EN, RO): secțiune despre formatele de export, tipurile de întrebări și șabloanele existente; SCORM marcat explicit „planificat, neimplementat, netestat pe LMS”.
- „Stare: stabil” și „Offline: complet” în toate cele 8 README.
- Neimplementat: export SCORM, tipuri noi de întrebări, șabloane noi.
