const fs = require('fs');
const html = fs.readFileSync('E:/网站方案/gugong.html', 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
js = js.replace(/\(async function boot\(\)[\s\S]*$/, '');
const mkEl = () => ({ addEventListener(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, dataset:{}, innerHTML:'', textContent:'' });
global.document = { querySelector: () => mkEl(), querySelectorAll: () => [], addEventListener(){}, getElementById: () => mkEl(), documentElement: {} };
global.location = { search: '' };
global.localStorage = { _s:{}, getItem(k){ return this._s[k] || null; }, setItem(k,v){ this._s[k]=v; } };
global.navigator = { clipboard: { writeText: async () => {} } };

js += `
(async () => {
  await loadData();
  console.log('DATA galleries:', GALLERIES.length, 'routes:', ROUTES.length, 'artworks:', ARTWORKS.length, 'pop:', POPULARITY.length, 'practical:', !!PRACTICAL);

  /* 验收#2：7 区域分组 22 展馆全覆盖 */
  const byRegion = {};
  let badRegion = 0;
  GALLERIES.forEach(g => {
    if (!REGION_ORDER.includes(g.region)) { badRegion++; console.log('  BAD REGION:', g.id, g.region); }
    (byRegion[g.region] = byRegion[g.region] || []).push(g.id);
  });
  REGION_ORDER.forEach(r => console.log('  region', r, '=', (byRegion[r] || []).length));
  console.log('REGION total=', GALLERIES.length, 'bad=', badRegion, 'empty=', REGION_ORDER.filter(r => !(byRegion[r] || []).length));

  /* 用例1：2小时 + 精选 → 中轴精华 */
  let r1 = matchRoute({ timeMin:120, interests:[], pace:'highlights', ticket:'later' });
  console.log('CASE1 base=', r1.basedOn, '| stops=', r1.stops.map(s => s.galleryId + ':' + s.duration_min).join(','), '| total=', r1.totalMin);

  /* 用例2：半天 + 珍宝钟表 + 只看免费 → 半日游但剔除付费馆 */
  let r2 = matchRoute({ timeMin:240, interests:['treasure','clock'], pace:'deep', ticket:'free' });
  const hasPaid = r2.stops.some(s => ['G_Treasure','G_Clock','G_Ningshou'].includes(s.galleryId));
  console.log('CASE2 base=', r2.basedOn, '| hasPaid=', hasPaid, '| stops=', r2.stops.map(s => s.galleryId).join(','), '| total=', r2.totalMin);

  /* 用例3：全天 + 陶瓷雕塑 + 深度 + 愿意 */
  let r3 = matchRoute({ timeMin:420, interests:['ceramics','sculpture'], pace:'deep', ticket:'willing' });
  console.log('CASE3 base=', r3.basedOn, '| hasWuying=', r3.stops.some(s=>s.galleryId==='G_Wuying'), '| hasSculpture=', r3.stops.some(s=>s.galleryId==='G_Sculpture'), '| total=', r3.totalMin);

  /* 用例4：2小时 + 摄影 + 现场再说 → photo_spots 基底 + 可选标记 */
  let r4 = matchRoute({ timeMin:120, interests:[], pace:'photo', ticket:'later' });
  console.log('CASE4 base=', r4.basedOn, '| optTicket=', r4.stops.filter(s=>s.optionalTicket).map(s=>s.galleryId).join(','), '| photoAll=', r4.stops.every(s=>s.photo));

  /* 跳过路径：默认中轴精华 */
  const skip = normalizePreset(ROUTES.find(r => r.id === 'highlights_2h'));
  console.log('SKIP regions=', routeRegions(skip).join('/'), '| stops=', skip.stops.length, '| exitFiltered=', !skip.stops.some(s => /神武门/.test(s.name || '')));
  const sSouth = stopsInRegion(skip, 'South');
  console.log('  South stops=', sSouth.map(s => (s.virtual ? 'V-' : '') + s.galleryId).join(','));
  const sNorth = stopsInRegion(skip, 'North');
  console.log('  North stops=', sNorth.map(s => (s.virtual ? 'V-' : '') + s.galleryId).join(','));

  /* 底图与图层 */
  const mh = mapHTML();
  console.log('MAP len=', mh.length, '| blocks=', (mh.match(/area-block/g) || []).length, '| hasLayers=', mh.includes('rpLayer') && mh.includes('mkLayer'));

  /* 双语 */
  LANG = 'en';
  console.log('I18N en regionFront=', STR.regionNames.Front[LANG], '| T(mustSee)=', T('mustSee'), '| route nameEN=', TL(ROUTES[0], 'name'));
  LANG = 'cn';
  console.log('I18N cn regionFront=', STR.regionNames.Front[LANG], '| T(mustSee)=', T('mustSee'));
  console.log('I18N STR keys missing cn/en:', Object.keys(STR).filter(k => typeof STR[k] === 'object' && !Array.isArray(STR[k]) && k !== 'regionNames' && (!STR[k].cn || !STR[k].en)));
  console.log('STR.regionNames all 7:', REGION_ORDER.every(r => STR.regionNames[r] && STR.regionNames[r].cn && STR.regionNames[r].en && STR.regionNames[r].subcn && STR.regionNames[r].suben));

  /* 总结卡双语 */
  state.route = skip; state.regionsInRoute = routeRegions(skip);
  LANG = 'en'; const sumEn = summaryHTML();
  LANG = 'cn'; const sumCn = summaryHTML();
  console.log('SUMMARY en has Hours=', sumEn.includes('Hours'), '| cn has 开放=', sumCn.includes('开放'), '| treasures=', sumCn.includes('清明上河图') === false ? '(none on axis route, ok)' : 'yes');
})().catch(e => { console.error('FAIL:', e.message); console.error(e.stack); process.exit(1); });
`;
eval(js);
