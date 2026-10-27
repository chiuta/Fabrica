// Teste Fabrica 2.1.0: tip numeric, export SCORM 1.2 (manifest + adaptor către un API LMS SIMULAT), 2 șabloane noi, punte Undava.
// ATENȚIE: adaptorul SCORM este testat doar împotriva unui API simulat din test, NU pe un LMS real.
import {createRequire} from 'module';
import path from 'path'; import {fileURLToPath} from 'url'; import fs from 'fs'; import os from 'os';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const __dir = path.dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + path.resolve(__dir, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, m + ' (obținut ' + A + ', așteptat ' + B + ')'); };
const sect = (s) => console.log('\n## ' + s);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fab21-'));
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
async function mk(url, init) {
  const ctx = await browser.newContext({viewport: {width: 1200, height: 800}});
  const reqs = []; await ctx.route(/^https?:/, (r) => { reqs.push(r.request().url()); r.abort(); });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused/i.test(t)) errs.push('csp: ' + t); });
  p.__errs = errs; p.__reqs = reqs; await p.goto(url); return p;
}

sect('1. Tip numeric: parsare, notare, validare, CSV');
const ed = await mk(APP); await ed.waitForFunction(() => window.__fabrica);
const parse = await ed.evaluate(() => ['3,5', '3.5', '1.234,5', '1,234.5', '1 000', '−2', 'abc', '', '1,2,3', '1.2.3', '12e3', '+7', ' 4 '].map((x) => FabricaPlayer.parseNum(x)));
eq(parse.map((x) => (Number.isNaN(x) || x === null) ? 'NaN' : x), [3.5, 3.5, 1234.5, 1234.5, 1000, -2, 'NaN', 'NaN', 'NaN', 'NaN', 12000, 7, 4], 'parseNum');
const g = await ed.evaluate(() => {
  const gr = (q, r) => FabricaPlayer.grade(Object.assign({type: 'num'}, q), r).ok;
  return [gr({value: 3.14, tol: 0.01}, '3,15'), gr({value: 3.14, tol: 0.01}, '3.16'), gr({value: 10, tol: 0}, '10'), gr({value: 10, tol: 0}, '10.0001'), gr({value: 0, tol: 0}, '0'), gr({value: 5, tol: 0}, ''), gr({value: 5, tol: 0}, 'cinci'), gr({value: -2.5, tol: 0.5}, '-2'), gr({value: 1000000, tol: 0}, '1 000 000')];
});
eq(g, [true, false, true, false, true, false, false, true, true], 'grade num (tolerance, virgulă, spații)');
const lint = await ed.evaluate(() => {
  const c = __fabrica.templates('quiz', 'ro'); c.finalTest.bank.push({id: 'qn1', type: 'num', text: 'Test', explain: '', okMsg: '', badMsg: '', value: 'abc', tol: 0, unit: ''});
  const r = __fabrica.lint(c); return r.filter((x) => x.sev === 'error').map((x) => x.code);
});
ok(lint.includes('q_num_value'), 'validator: valoare nenumerică semnalată (' + lint + ')');
const csv = await ed.evaluate(() => { const r = __fabrica.csvToQuestions('tip;întrebare;corect;greșit1;greșit2;greșit3;explicație\nnumeric;Cât face 2+2?;4;0,5;unități;;simplu\nnumeric;Fără număr;abc\nnum;Pi;3.14;0.01'); return {n: r.questions.length, e: r.errors.map((x) => x.code), q: r.questions.map((q) => [q.type, q.value, q.tol, q.unit])}; });
eq(csv, {n: 2, e: ['csv_num'], q: [['num', 4, 0.5, 'unități'], ['num', 3.14, 0.01, '']]}, 'CSV numeric (valoare;toleranță;unitate)');
// normalizare la import .course.json (valoare invalidă -> 0 + avertisment)
const nrm = await ed.evaluate(() => { const c = __fabrica.templates('quiz', 'ro'); c.finalTest.bank.push({id: 'qn2', type: 'num', text: 'T', value: 'x', tol: '-3', unit: 'kg'}); const r = __fabrica.normCourse(c); const q = r.course.finalTest.bank.slice(-1)[0]; return {v: q.value, t: q.tol, u: q.unit, probs: r.probs.map((p) => p.code)}; });
eq(nrm, {v: 0, t: 3, u: 'kg', probs: ['import_num']}, 'normalizare num la import');
// editor: adăugare întrebare numerică din UI, editare câmpuri
await ed.evaluate(() => __fabrica.setCourse(__fabrica.templates('short', 'ro')));
await ed.click('#tab-content');
const nOpt = await ed.evaluate(() => [...document.querySelectorAll('select[data-qadd] option')].map((o) => o.value));
ok(nOpt.includes('num'), 'tipul „num” apare în lista de adăugare');
await ed.selectOption('select[data-qadd]', 'num'); await ed.click('[data-act="q-add"]');
const hasF = await ed.evaluate(() => !!document.querySelector('input[data-p$=".value"]') && !!document.querySelector('input[data-p$=".tol"]'));
ok(hasF, 'câmpurile valoare și toleranță apar în editor');
await ed.fill('input[data-p$=".value"]', '12.5'); await ed.fill('input[data-p$=".tol"]', '0.5');
const qv = await ed.evaluate(() => { const l = __fabrica.course.levels[0].lessons[0].questions; const q = l[l.length - 1]; return [q.type, q.value, q.tol]; });
eq(qv, ['num', 12.5, 0.5], 'valorile se salvează numeric în curs');
eq(ed.__errs, [], '0 erori/CSP în editor'); eq(ed.__reqs, [], '0 cereri de rețea');

sect('2. Tip numeric în cursul generat');
const courseNum = await ed.evaluate(() => { const c = __fabrica.templates('short', 'ro'); c.levels[0].lessons[0].questions = [{id: 'qn', type: 'num', text: 'Cât face 6 × 7?', explain: 'Produs.', okMsg: '', badMsg: '', value: 42, tol: 0, unit: 'buc'}]; c.title = 'Num'; return c; });
const htmlNum = await ed.evaluate(async (c) => (await __fabrica.buildHtml(__fabrica.normCourse(c).course)).html, courseNum);
const fNum = path.join(tmp, 'num.html'); fs.writeFileSync(fNum, htmlNum);
const gp = await mk('file://' + fNum);
await gp.evaluate(() => location.hash = '#/l/l1'); await gp.waitForTimeout(150);
ok(await gp.locator('input[data-numin]').count() === 1, 'câmp numeric randat'); ok(/buc/.test(await gp.textContent('main')), 'unitatea e afișată');
await gp.fill('input[data-numin]', '41'); await gp.click('[data-act="check"]'); await gp.waitForTimeout(100);
ok(/42/.test(await gp.textContent('[data-fb]')), 'răspuns greșit: se afișează valoarea corectă');
await gp.click('[data-act="retry"]'); await gp.fill('input[data-numin]', '42,0'); await gp.click('[data-act="check"]'); await gp.waitForTimeout(100);
ok(await gp.locator('.fb.ok').count() === 1, 'răspuns corect (42,0) acceptat');
eq(gp.__errs, [], '0 erori/CSP în generat'); eq(gp.__reqs, [], '0 cereri de rețea în generat');

sect('3. SCORM 1.2: pachet și manifest');
const pk = await ed.evaluate(async () => {
  const c = __fabrica.templates('short', 'ro'); c.title = 'Curs <test> & "SCORM"';
  const r = await __fabrica.buildScorm(c); const files = await __fabrica.zipRead(r.zip);
  const html = new TextDecoder().decode(files.find((f) => f.name === 'index.html').data), v = await __fabrica.verifyHtml(html);
  const plain = (await __fabrica.buildHtml(c)).html;
  return {names: files.map((f) => f.name), issues: r.issues, manifest: r.manifest, csp: v, hasFlag: /"scorm":"1\.2"/.test(html), plainFlag: /"scorm"/.test(plain), zipLen: r.zip.length, head: Array.from(r.zip.slice(0, 4))};
});
eq(pk.names, ['imsmanifest.xml', 'index.html'], 'ZIP: imsmanifest.xml la rădăcină + index.html');
eq(pk.head, [0x50, 0x4b, 3, 4], 'antet ZIP (PK 03 04)');
eq(pk.issues, [], 'manifest fără probleme de structură');
ok(pk.csp.ok, 'index.html din pachet trece verificarea CSP (' + JSON.stringify(pk.csp.issues) + ')');
ok(pk.hasFlag && !pk.plainFlag, 'steag scorm doar în pachetul SCORM');
ok(/<schemaversion>1\.2<\/schemaversion>/.test(pk.manifest) && /adlcp:scormtype="sco"/.test(pk.manifest) && /Curs &lt;test&gt; &amp; &quot;SCORM&quot;/.test(pk.manifest), 'manifest: schemaversion 1.2, scormtype sco, titlu escapat XML');
const mut = await ed.evaluate((man) => {
  const names = ['index.html', 'imsmanifest.xml']; const out = {};
  const M = (k, a, b) => { out[k] = __fabrica.scormCheck(man.replace(a, b), names); };
  M('href', 'href="index.html">', 'href="lipsa.html">');
  M('scormtype', 'adlcp:scormtype="sco"', 'adlcp:scormtype="asset"');
  M('ref', 'identifierref="res-1"', 'identifierref="nu-exista"');
  M('ver', '<schemaversion>1.2', '<schemaversion>2004');
  M('default', /<organizations default="[^"]*"/, '<organizations default="altceva"');
  M('ns', 'xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"', 'xmlns="urn:x"');
  out.xml = __fabrica.scormCheck(man.replace('</manifest>', ''), names);
  return out;
}, pk.manifest);
ok(mut.href.includes('href_not_in_package'), 'manifest cu href lipsă din pachet e respins'); ok(mut.scormtype.includes('scormtype'), 'scormtype greșit respins');
ok(mut.ref.includes('identifierref'), 'identifierref orfan respins'); ok(mut.ver.includes('schemaversion'), 'schemaversion greșit respins');
ok(mut.default.includes('default_org'), 'organizația implicită inexistentă respinsă'); ok(mut.ns.includes('root_manifest_ns'), 'spațiu de nume greșit respins'); ok(mut.xml.includes('xml_parse'), 'XML malformat respins');
// exportul din UI descarcă un .zip
await ed.evaluate(() => __fabrica.setCourse(__fabrica.templates('short', 'ro')));
await ed.click('#tab-export');
const [dl] = await Promise.all([ed.waitForEvent('download'), ed.click('[data-act="exp-scorm"]')]);
ok(/-scorm12\.zip$/.test(dl.suggestedFilename()), 'butonul SCORM descarcă ' + dl.suggestedFilename());

sect('4. SCORM 1.2: adaptor față de un API LMS SIMULAT');
const MOCK = () => {
  window.__calls = []; window.__store = {'cmi.suspend_data': window.__sd || '', 'cmi.core.lesson_status': 'not attempted'};
  window.API = {LMSInitialize: (a) => { __calls.push(['init', a]); return 'true'; }, LMSFinish: (a) => { __calls.push(['finish', a]); return 'true'; }, LMSGetValue: (k) => { __calls.push(['get', k]); return __store[k] || ''; }, LMSSetValue: (k, v) => { __calls.push(['set', k, v]); __store[k] = v; return 'true'; }, LMSCommit: () => { __calls.push(['commit']); return 'true'; }, LMSGetLastError: () => '0', LMSGetErrorString: () => '', LMSGetDiagnostic: () => ''};
};
const sc = await ed.evaluate(async () => {
  const c = __fabrica.templates('quiz', 'ro'); c.title = 'Sc'; c.id = 'sc-test';
  c.levels = [{id: 'n1', title: 'N', lessons: [{id: 'l1', title: 'L1', body: 'x', questions: []}, {id: 'l2', title: 'L2', body: 'y', questions: []}]}];
  c.finalTest.bank = [{id: 'qt1', type: 'tf', text: 'Cerul e albastru.', explain: '', okMsg: '', badMsg: '', answer: true}]; c.finalTest.threshold = 50; c.finalTest.enabled = true; c.finalTest.count = 0; c.finalTest.includeLessonQuestions = false;
  const r = await __fabrica.buildScorm(__fabrica.normCourse(c).course); const files = await __fabrica.zipRead(r.zip);
  return new TextDecoder().decode(files.find((f) => f.name === 'index.html').data);
});
const fSc = path.join(tmp, 'sco.html'); fs.writeFileSync(fSc, sc);
let sp = await mk('file://' + fSc, MOCK); await sp.waitForTimeout(250);
const setv = () => sp.evaluate(() => __calls.filter((c) => c[0] === 'set').map((c) => c[1] + '=' + c[2]));
let calls = await sp.evaluate(() => __calls.map((c) => c[0]));
eq(calls[0], 'init', 'LMSInitialize e prima apelare'); eq(await sp.evaluate(() => __calls[0][1]), '', 'LMSInitialize("")');
ok((await setv()).includes('cmi.core.lesson_status=incomplete'), 'stare inițială: incomplete');
await sp.evaluate(() => location.hash = '#/l/l1'); await sp.waitForTimeout(100); await sp.click('[data-act="toggle-done"]'); await sp.waitForTimeout(100);
await sp.evaluate(() => location.hash = '#/l/l2'); await sp.waitForTimeout(100); await sp.click('[data-act="toggle-done"]'); await sp.waitForTimeout(100);
ok((await sp.evaluate(() => __store['cmi.suspend_data'])).includes('"l1"') && (await sp.evaluate(() => __store['cmi.suspend_data'])).includes('"l2"'), 'suspend_data cu lecțiile terminate');
eq(await sp.evaluate(() => __store['cmi.core.lesson_status']), 'incomplete', 'cu test final nepromovat: încă incomplete');
await sp.evaluate(() => location.hash = '#/test'); await sp.waitForTimeout(150);
await sp.check('input[type=radio][value="true"]'); await sp.click('[data-act="submit-test"]'); await sp.waitForTimeout(200);
eq(await sp.evaluate(() => __store['cmi.core.lesson_status']), 'passed', 'test promovat -> passed');
eq([await sp.evaluate(() => __store['cmi.core.score.raw']), await sp.evaluate(() => __store['cmi.core.score.min']), await sp.evaluate(() => __store['cmi.core.score.max'])], ['100', '0', '100'], 'scor 100 / 0 / 100');
ok((await sp.evaluate(() => __calls.filter((c) => c[0] === 'commit').length)) >= 3, 'LMSCommit apelat');
const nsets = await sp.evaluate(() => __calls.filter((c) => c[0] === 'set').length); await sp.evaluate(() => location.hash = '#/'); await sp.waitForTimeout(100);
eq(await sp.evaluate(() => __calls.filter((c) => c[0] === 'set').length), nsets, 'fără scrieri redundante la navigare');
await sp.evaluate(() => dispatchEvent(new Event('pagehide'))); await sp.waitForTimeout(50);
const fin = await sp.evaluate(() => __calls.slice(-1)[0][0]); eq(fin, 'finish', 'LMSFinish la închidere');
const st = await sp.evaluate(() => __store['cmi.core.session_time']); ok(/^\d{4}:\d{2}:\d{2}$/.test(st), 'session_time în format SCORM 1.2 (' + st + ')');
eq(await sp.evaluate(() => __store['cmi.core.exit']), '', 'exit="" după promovare');
ok(await sp.evaluate(() => !!(window.FabricaPlayer && FabricaPlayer.scorm().ended)), 'starea adaptorului: ended');
eq(sp.__errs, [], '0 erori/CSP (SCORM)'); eq(sp.__reqs, [], '0 cereri de rețea (SCORM)');
// reluare din suspend_data, localStorage gol
const sp2 = await mk('file://' + fSc, () => { window.__sd = JSON.stringify({v: 1, d: ['l1', 'nu-exista']}); (function () { window.__calls = []; window.__store = {'cmi.suspend_data': window.__sd, 'cmi.core.lesson_status': 'incomplete'}; window.API = {LMSInitialize: () => 'true', LMSFinish: () => 'true', LMSGetValue: (k) => window.__store[k] || '', LMSSetValue: (k, v) => { window.__store[k] = v; window.__calls.push(k); return 'true'; }, LMSCommit: () => 'true'}; })(); });
await sp2.waitForTimeout(250);
eq(await sp2.evaluate(() => JSON.parse(__store['cmi.suspend_data']).d), ['l1'], 'reluare: l1 restaurată, id necunoscut ignorat');
// API găsit în fereastra părinte (iframe) și fără API deloc
const lmsCtx = await browser.newContext(); const lmsLog = [];
await lmsCtx.route('http://lms.test/**', (r) => { const u = new URL(r.request().url());
  if (u.pathname === '/lms.html') return r.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><script>window.__log=[];window.API={LMSInitialize:function(){__log.push("init");return "true"},LMSFinish:function(){return "true"},LMSGetValue:function(){return ""},LMSSetValue:function(k,v){__log.push(k+"="+v);return "true"},LMSCommit:function(){return "true"}};</script><iframe id="f" src="/sco.html" width="900" height="600"></iframe>'});
  if (u.pathname === '/sco.html') return r.fulfill({status: 200, contentType: 'text/html', body: sc});
  lmsLog.push(u.href); r.abort(); });
const lp = await lmsCtx.newPage(); await lp.goto('http://lms.test/lms.html'); await lp.waitForTimeout(600);
const plog = await lp.evaluate(() => __log);
ok(plog[0] === 'init' && plog.includes('cmi.core.lesson_status=incomplete'), 'API găsit în fereastra părinte (iframe, aceeași origine): ' + plog.slice(0, 2).join(','));
eq(lmsLog, [], 'fără alte cereri');
const nolms = await mk('file://' + fSc); await nolms.waitForTimeout(250);
eq(await nolms.evaluate(() => FabricaPlayer.scorm().active), false, 'fără API: cursul rulează normal (adaptor inactiv)'); eq(nolms.__errs, [], 'fără API: 0 erori');
const plain = await mk('file://' + fNum, MOCK); await plain.waitForTimeout(200);
eq(await plain.evaluate(() => __calls.length), 0, 'export non-SCORM nu atinge API-ul LMS');

sect('5. Șabloane noi în română');
for (const k of ['online', 'invatare']) {
  const r = await ed.evaluate((k) => { const c = __fabrica.templates(k, 'en'); const n = __fabrica.normCourse(c); const l = __fabrica.lint(n.course).filter((x) => x.sev === 'error').map((x) => x.code); const types = {}; const all = []; n.course.levels.forEach((lv) => lv.lessons.forEach((ls) => ls.questions.forEach((q) => all.push(q)))); n.course.finalTest.bank.forEach((q) => all.push(q)); all.forEach((q) => types[q.type] = 1); return {lang: n.course.lang, errs: l, probs: n.probs.length, types: Object.keys(types).sort(), lessons: n.course.levels[0].lessons.length}; }, k);
  eq([r.lang, r.errs, r.probs, r.lessons], ['ro', [], 0, 3], 'șablon ' + k + ': în română, 0 erori de validare, 3 lecții (' + r.errs + ')');
  ok(r.types.includes('num') && r.types.includes('order') && r.types.includes('match'), 'șablon ' + k + ' folosește num/order/match: ' + r.types);
  const ex = await ed.evaluate(async (k) => { const c = __fabrica.normCourse(__fabrica.templates(k, 'ro')).course; const h = await __fabrica.buildHtml(c); const v = await __fabrica.verifyHtml(h.html); return v.ok; }, k);
  ok(ex, 'șablon ' + k + ' se exportă cu CSP valid');
}
await ed.click('#tab-meta'); await ed.click('#btn-tpl'); await ed.waitForSelector('#dlg-tpl[open]');
eq(await ed.locator('#tpl-list li').count(), 6, '6 șabloane în dialog');

sect('6. Punte Undava: numeric cu toleranță în ambele sensuri');
const un = await ed.evaluate(() => {
  const c = __fabrica.normCourse(__fabrica.templates('short', 'ro')).course;
  c.finalTest.bank = []; c.levels[0].lessons.length = 1; c.levels[0].lessons[0].questions = [{id: 'qn', type: 'num', text: 'Cât e 10 / 4?', explain: '', okMsg: '', badMsg: '', value: 2.5, tol: 0.1, unit: ''}];
  const u = __fabrica.undavaFromCourse(c); const back = __fabrica.undavaToQuestions(JSON.stringify(u.quizzes));
  return {q: u.quizzes[0].questions[0], n: u.n, skipped: u.skipped, back: back.questions.map((q) => [q.type, q.value, q.tol]), errs: back.errors.length};
});
eq([un.q.type, un.q.tol, un.q.answers[0].text, un.n], ['num', 0.1, '2.5', 1], 'export Undava: type num + tol');
eq([un.back, un.errs], [[['num', 2.5, 0.1]], 0], 'import Undava: num cu toleranță -> tip numeric Fabrica');

console.log(`\n${pass} teste reușite, ${fail} eșuate`);
await browser.close(); process.exit(fail ? 1 : 0);
