// Consistency smoke test for Met data (mirrors met.html logic)
const fs = require('fs');
const path = require('path');
const D = p => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', p), 'utf8'));

const GALLERIES = D('galleries.json').galleries;
const ROUTES = D('routes.json').routes;
const ARTWORKS = D('artworks.json');
const POP = D('popularity.json').popularityEstimates.items;

let fail = 0;
const bad = m => { console.log('FAIL:', m); fail++; };
const ok = m => console.log('ok:', m);

// 1. route stops reference existing galleries
const gids = new Set(GALLERIES.map(g => g.id));
ROUTES.forEach(r => r.stops.forEach(s => { if (!gids.has(s.galleryId)) bad(`${r.id} stop -> missing ${s.galleryId}`); }));
ok('route stops -> gallery ids');

// 2. every gallery has hotspot + nameCN + valid floor
GALLERIES.forEach(g => {
  if (!g.hotspot || typeof g.hotspot.x !== 'number' || typeof g.hotspot.y !== 'number') bad(`${g.id} missing hotspot`);
  if (g.hotspot && (g.hotspot.x < 0 || g.hotspot.x > 1 || g.hotspot.y < 0 || g.hotspot.y > 1)) bad(`${g.id} hotspot out of range`);
  if (!g.nameCN) bad(`${g.id} missing nameCN`);
  if (![1, 2, 'Rooftop'].includes(g.floor)) bad(`${g.id} weird floor ${g.floor}`);
});
ok('hotspots/nameCN/floors');

// 3. galleryNumber -> gallery mapping (same algorithm as met.html)
function galleryOfNumber(numStr) {
  if (!numStr) return null;
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return null;
  let best = null, bestSpan = Infinity;
  GALLERIES.forEach(g => {
    if (!g.galleryNumber) return;
    const parts = String(g.galleryNumber).split('-').map(x => parseInt(x, 10));
    const lo = parts[0], hi = parts.length > 1 ? parts[1] : parts[0];
    if (n >= lo && n <= hi) { const span = hi - lo; if (span < bestSpan) { bestSpan = span; best = g.id; } }
  });
  return best;
}
const OVR = { 544450: 'G_Egyptian_General', 322609: 'G_Assyrian', 436528: 'G_Impressionist' };
const EXPECT = {
  547802: 'G131', 11417: 'G_American', 436532: 'G_Impressionist', 437127: 'G_Impressionist',
  437879: 'G_Dutch', 437394: 'G_Dutch', 438817: 'G_Impressionist', 196439: 'G_Impressionist',
  12127: 'G_American', 488978: 'G_Modern', 544450: 'G_Egyptian_General', 322609: 'G_Assyrian',
  436524: 'G_Impressionist', 436535: 'G_Impressionist', 436529: 'G_Impressionist',
  437133: 'G_Impressionist', 437135: 'G_Impressionist', 436528: 'G_Impressionist',
  436530: 'G_Impressionist', 436533: 'G_Impressionist'
};
ARTWORKS.forEach(a => {
  const got = OVR[a.objectID] || galleryOfNumber(a.galleryNumber);
  const exp = EXPECT[a.objectID];
  if (exp && got !== exp) bad(`artwork ${a.objectID} ${a.title}: mapped ${got}, expect ${exp}`);
});
ok('artwork -> gallery mapping');

// 4. local images exist for artworks that have them
const IMG_DIR = path.join(__dirname, 'images', 'artworks', 'opt');
const imgFiles = fs.readdirSync(IMG_DIR);
ARTWORKS.forEach(a => {
  const has = imgFiles.some(f => f.startsWith(a.objectID + '_'));
  if (has && !a.primaryImageSmall) console.log(`note: ${a.objectID} has local img but no remote URL (fine, local fallback)`);
});
ok('local images dir: ' + imgFiles.length + ' files');

// 5. popularity ids all mapped in met.html POP_MAP
const POP_MAP_IDS = ['temple_dendur','egyptian_art','lamassu','islamic_art','arms_armor','greek_roman','astor_court','european_paintings','van_gogh','monet_waterlilies','degas_dance','vermeer','rembrandt','washington_crossing','madame_x','pollock','hatshepsut','roof_garden'];
POP.forEach(p => { if (!POP_MAP_IDS.includes(p.id)) bad(`popularity id unmapped: ${p.id}`); });
ok('popularity ids');

// 6. maps exist
['f1.png', 'f2.png', 'roof.png'].forEach(f => {
  if (!fs.existsSync(path.join(__dirname, 'images', 'maps', f))) bad(`missing map ${f}`);
});
ok('maps');

// 7. gallery photos referenced by met.html GALLERY_IMG exist in opt/
const GALLERY_IMG = {
  G_ArmsArmor: ['gal_G_ArmsArmor.jpg'],
  G_GreekRoman: ['gal_G_GreekRoman.jpg'],
  G_Lehman: ['gal_G_Lehman.jpg', 'gal_G_Lehman_collection.jpg'],
  G_EuropeanPaintings: ['gal_G_EuropeanPaintings.jpg'],
  G_Islamic: ['gal_G_Islamic.jpg'],
  G_Chinese: ['gal_G_Chinese.jpg'],
  G_AstorCourt: ['gal_G_AstorCourt.jpg'],
  G_Modern: ['gal_G_Modern.jpg']
};
Object.entries(GALLERY_IMG).forEach(([gid, files]) => {
  if (!gids.has(gid)) bad(`GALLERY_IMG unknown gallery ${gid}`);
  files.forEach(f => { if (!fs.existsSync(path.join(IMG_DIR, f))) bad(`missing gallery img ${f}`); });
});
ok('gallery photos');

console.log(fail ? `\n${fail} FAILURES` : '\nALL CHECKS PASSED');
process.exit(fail ? 1 : 0);
