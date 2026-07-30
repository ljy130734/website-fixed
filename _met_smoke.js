const fs = require('fs');
const html = fs.readFileSync('E:/网站方案/met.html', 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
js = js.replace(/\(async function boot\(\)[\s\S]*$/, '');
const mkEl = () => ({ addEventListener(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, dataset:{}, innerHTML:'', textContent:'' });
global.document = { querySelector: () => mkEl(), querySelectorAll: () => [], addEventListener(){}, getElementById: () => mkEl(), documentElement: {} };
global.window = global;
global.localStorage = { _s:{}, getItem(k){ return this._s[k] || null; }, setItem(k,v){ this._s[k]=v; } };
global.navigator = { clipboard: { writeText: async () => {} } };
global.fetch = async () => { throw new Error('file:// mode'); }; // force EMBEDDED fallback

js += `
(async () => {
  await loadData();
  console.log('DATA galleries:', GALLERIES.length, 'routes:', ROUTES.length, 'artworks:', ARTWORKS.length, 'pop:', POPULARITY.length, 'practical:', !!PRACTICAL);

  // 楼层分组
  const byF = {};
  GALLERIES.forEach(g => { const k = floorKey(g.floor); (byF[k] = byF[k] || []).push(g.id); });
  console.log('FLOORS 1F=', byF['1F'].length, '2F=', byF['2F'].length, 'Roof=', (byF['Roof']||[]).length);
  console.log('  1F:', byF['1F'].join(','));
  console.log('  2F:', byF['2F'].join(','));

  // 用例1：1-2h + 无兴趣 + 精选 → highlights_2h 基底，时长×0.8
  let r1 = matchRoute({ timeMin:120, interests:[], pace:'highlights', access:false });
  console.log('CASE1 base=', r1.basedOn, '| stops=', r1.stops.map(s => s.galleryId + ':' + s.duration_min).join(','), '| total=', r1.totalMin);

  // 用例2：半天 + 古埃及+伊斯兰 + 深度 → ancient 基底 + 时长×1.3
  let r2 = matchRoute({ timeMin:240, interests:['egypt','islamic'], pace:'deep', access:true });
  console.log('CASE2 base=', r2.basedOn, '| stops=', r2.stops.map(s => s.galleryId + ':' + s.duration_min).join(','), '| total=', r2.totalMin);

  // 用例3：摄影打卡节奏 → instagram_spots 含屋顶
  let r3 = matchRoute({ timeMin:120, interests:[], pace:'photo', access:false });
  console.log('CASE3 base=', r3.basedOn, '| stops=', r3.stops.map(s => s.galleryId).join(','), '| floors=', routeFloors(r3).join('/'));

  // 用例4：一整天 + 亚洲艺术 → full_day
  let r4 = matchRoute({ timeMin:360, interests:['asia'], pace:'wander', access:false });
  console.log('CASE4 base=', r4.basedOn, '| stops=', r4.stops.length, '| floors=', routeFloors(r4).join('/'));

  // 楼层排序验证（CASE2: 1F 应在 2F 前）
  const ord = r2.stops.map(s => floorKey(galleryById(s.galleryId).floor));
  console.log('CASE2 floor order:', ord.join('>'));
  const roofLast = ord.every((f,i,a) => f !== 'Roof' || i === a.length - 1 || a.slice(i+1).every(x => x === 'Roof'));
  console.log('roof is last:', roofLast);

  // 各展厅展品数
  GALLERIES.forEach(g => { const n = artworksOfGallery(g.id).length; if (n) console.log('  arts', g.id, '=', n); });
})().catch(e => { console.error('ERR', e); process.exit(1); });
`;
eval(js);
