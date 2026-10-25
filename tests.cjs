const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const app = readFileSync(__dirname + '/index.html', 'utf8')
  .split('<script>')[1].split('</script>')[0].split('(function start()')[0];

function createContext() {
  const elements = {};
  let clock = 0;
  const get = selector => elements[selector] || (elements[selector] = {
    value: selector === '#g_time' ? '2' : '0', style: {}, textContent: '',
    classList: { add() {}, remove() {} }, addEventListener() {}, querySelector() {},
  });
  const context = vm.createContext({
    console, assert, performance: { now: () => clock }, advance: () => clock += 1000,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: { querySelector: get, querySelectorAll: () => [], addEventListener() {} },
    window: { addEventListener() {} }, navigator: {}, location: { protocol: 'file:' },
    setTimeout, clearTimeout, URLSearchParams, URL, Blob, confirm: () => true,
  });
  vm.runInContext(app, context);
  return context;
}

const fixture = `
render=()=>{}; toast=()=>{}; save=()=>{};
function fixture(){
 DB=blank(); DB.settings.days=['Selasa']; DB.settings.periods=4; DB.settings.times=defaultTimes(4);
 DB.classes=[{id:'a',name:'1A',short:'1A',off:{}},{id:'b',name:'1B',short:'1B',off:{}}];
 DB.teachers=[{id:'pj',name:'Guru PJ',short:'PJ',off:{}},{id:'km',name:'Guru KM',short:'KM',off:{}}];
 DB.subjects=[{id:'pj',name:'PJ',short:'PJ',off:{}},{id:'km',name:'KM',short:'KM',off:{}}];
 DB.lessons=[{id:'pjA',classIds:['a'],teacherIds:['pj'],subjectId:'pj',group:'',len:1,perWeek:1},{id:'kmA',classIds:['a'],teacherIds:['km'],subjectId:'km',group:'',len:1,perWeek:1},{id:'pjB',classIds:['b'],teacherIds:['pj'],subjectId:'pj',group:'',len:1,perWeek:1}];
 DB.cards=[{lessonId:'pjA',day:0,period:0,len:1},{lessonId:'kmA',day:0,period:2,len:1,locked:true},{lessonId:'pjB',day:0,period:2,len:1}];
 return {card:DB.cards[0],lessonId:'pjA',len:1};
}
`;

const suites = [
  { name: "block", fixture: false, run: `
render = () => {}; toast = () => {};
DB = blank(); DB.settings.days = ['Isnin']; DB.settings.periods = 3; DB.settings.times = defaultTimes(3);
DB.classes = [{id:'c',name:'Kelas A',off:{'0-2':true}}];
DB.teachers = [{id:'t',name:'Guru A',off:{'0-2':true}}];
DB.subjects = [{id:'s',name:'Subjek',off:{}}];
DB.lessons = [{id:'l',classIds:['c'],teacherIds:['t'],subjectId:'s',len:1,perWeek:1}];
toggleSlotBlock('class','c',0,2); assert.equal(DB.classes[0].off['0-2'],undefined);
toggleSlotBlock('teacher','t',0,2); assert.equal(DB.teachers[0].off['0-2'],undefined);
assert.equal(canDrop('l',1,0,2).ok,true);
toggleSlotBlock('class','c',0,2); assert.equal(DB.classes[0].off['0-2'],true); assert.equal(canDrop('l',1,0,2).ok,false);
toggleSlotBlock('class','c',0,2); toggleSlotBlock('teacher','t',0,2); assert.equal(DB.teachers[0].off['0-2'],true); assert.equal(canDrop('l',1,0,2).ok,false);
const fresh = JSON.parse(JSON.stringify(DB)); fresh.classes[0].id='newc'; fresh.teachers[0].id='newt'; fresh.classes[0].off={'0-2':true}; fresh.teachers[0].off={}; fresh.lessons[0].classIds=['newc']; fresh.lessons[0].teacherIds=['newt']; fresh.cards=[{lessonId:'l',day:0,period:2,len:1,locked:true}];
restoreSlotBlocks(fresh,DB.settings.blockOverrides); assert.equal(fresh.classes[0].off['0-2'],undefined); assert.equal(fresh.teachers[0].off['0-2'],true); assert.equal(fresh.cards.length,0);
DB.cards=[{lessonId:'l',day:0,period:0,len:1}]; toggleSlotBlock('class','c',0,0); assert.equal(DB.classes[0].off['0-0'],undefined);
console.log('PASS: class and teacher unblock/reblock, drop availability, sync persistence, occupied-slot protection');
` },
  { name: "collision", fixture: true, run: `let move=fixture();
assert.deepEqual(Array.from(canDrop('pjA',1,0,2,move.card).collisions,c=>c.lessonId),['kmA','pjB'],'PJ onto KM also finds its teacher in another class');
let before=JSON.stringify(DB); assert.equal(placeDroppedCard(move,0,2),false); assert.equal(JSON.stringify(DB),before,'without approval no cards move or disappear');
assert.equal(placeDroppedCard(move,0,2,true),true); assert.equal(DB.cards.length,1); assert.equal(move.card.period,2); assert.equal(move.card.locked,true,'approval removes both collisions and places PJ');
assert.equal(DB.lessons.length,3); assert.equal(unplacedFor('class','a').some(x=>x.l.id==='kmA'),true); assert.equal(unplacedFor('class','b').some(x=>x.l.id==='pjB'),true,'removed cards return to unplaced lessons');
move=fixture(); DB.classes[0].off['0-2']=true; before=JSON.stringify(DB); assert.equal(placeDroppedCard(move,0,2,true),false); assert.equal(JSON.stringify(DB),before,'approval cannot bypass blocked times');
move=fixture(); DB.cards[2].period=1; DB.cards[2].len=2; assert.equal(canDrop('pjA',1,0,2,move.card).collisions.length,2,'teacher clashes across multi-period cards are detected');
move=fixture(); DB.cards.push({...DB.cards[2]}); assert.equal(canDrop('pjA',1,0,2,move.card).collisions.length,3,'all colliding cards are listed');
move=fixture(); DB.cards.shift(); assert.equal(placeDroppedCard({card:null,lessonId:'pjA',len:1},0,2,true),true); assert.equal(DB.cards[0].lessonId,'pjA','unplaced cards use the same confirmation rules');
` },
  { name: "combined", fixture: false, run: `
render=()=>{};toast=()=>{};DB=blank();DB.settings.days=['Isnin'];DB.settings.periods=2;DB.settings.times=defaultTimes(2);
DB.classes=[{id:'a',name:'1 AL RAZI',off:{}},{id:'b',name:'2 AL BIRUNI',off:{}}];
DB.teachers=[{id:'t',name:'Guru',off:{}}];
DB.subjects=[{id:'p',name:'P',off:{}},{id:'bm',name:'BM',off:{}}];
DB.lessons=[{id:'g',classIds:['a','b'],teacherIds:[],subjectId:'p',group:'',len:1,perWeek:1},
 {id:'o',classIds:['a'],teacherIds:['t'],subjectId:'p',group:'',len:1,perWeek:1},
 {id:'w',classIds:['a'],teacherIds:[],subjectId:'bm',group:'',len:1,perWeek:1}];
DB.cards=[{lessonId:'g',day:0,period:0,len:1}];
assert.equal(canDrop('o',1,0,0).ok,true,'same subject may join combined class slot');
assert.equal(canDrop('w',1,0,0).ok,false,'other subject still clashes');
assert.equal(classUnits(DB.classes[0]),2,'combined same-subject not counted as extra load');
` },
  { name: "generation", fixture: false, run: `(async()=>{
 toast=()=>{}; checkData=()=>[]; DB=demo(); DB.settings.autoSync=false;
 let calls=0; attempt=async()=>{calls++;advance();if(calls===5)stopGenerate();return {placed:[],missing:999}};
 await runGenerate(true); assert.equal(calls,5,'continuous mode must exceed 2-second time limit'); assert.equal(generating,false);
 calls=0; await runGenerate(false); assert.equal(calls,2,'timed mode must stop at 2 seconds');
 const card={lessonId:DB.lessons[0].id,day:0,period:0,len:1,locked:true}; DB.cards=[card];
 attempt=async()=>{stopGenerate();return {placed:[],missing:999}}; await runGenerate(true);assert.equal(DB.cards[0],card,'manual stop preserves locked and best cards');
 console.log('PASS: continuous mode, timed mode, manual stop preserves best timetable');
})()` },
  { name: "group", fixture: false, run: `
render = () => {}; toast = () => {};
DB = blank(); DB.settings.days = ['Isnin']; DB.settings.periods = 3; DB.settings.times = defaultTimes(3);
DB.classes = [{id:'c',name:'1 AL RAZI',off:{}}];
DB.teachers = [{id:'t1',name:'LOKMAN',off:{}},{id:'t2',name:'HIDAYATI',off:{}},{id:'t3',name:'X',off:{}}];
DB.subjects = [{id:'pai',name:'PAI',off:{}},{id:'pm',name:'PM',off:{}},{id:'bm',name:'BM',off:{}}];
DB.lessons = [
 {id:'a',classIds:['c'],teacherIds:['t1'],subjectId:'pai',group:'PAI',len:2,perWeek:2},
 {id:'b',classIds:['c'],teacherIds:['t2'],subjectId:'pm',group:'PM',len:2,perWeek:2},
 {id:'w',classIds:['c'],teacherIds:['t3'],subjectId:'bm',group:'',len:1,perWeek:1}];
DB.cards=[{lessonId:'a',day:0,period:0,len:2}];
assert.equal(canDrop('b',2,0,0).ok,false,'groups without a class grouping set cannot share');
assert.equal(classUnits(DB.classes[0]),5,'ungrouped groups count separately');
DB.classes[0].groupSets='PAI, PM';
assert.equal(canDrop('b',2,0,0).ok,true,'PAI and PM groups may share the slot');
assert.equal(canDrop('w',1,0,0).ok,false,'entire-class lesson cannot overlap a group lesson');
assert.equal(canDrop('a',2,0,0,null).ok,false,'same group cannot double up');
DB.cards.push({lessonId:'b',day:0,period:0,len:2});
assert.equal(groupMates(DB.cards[0]).length,2,'PAI and PM cards are grouped');
assert.equal(placeDroppedCard({card:DB.cards[0],lessonId:'a',len:2},0,1),true);
assert.equal(DB.cards[1].period,1,'grouped PM card moves with PAI');
DB.cards[0].period=0;DB.cards[1].period=0;DB.cards.pop();
assert.equal(classUnits(DB.classes[0]),3,'parallel groups count once toward class load');
assert.equal(normGroup('Entire class'),'');
DB.cards[0].locked=true;unlockAll();assert.equal(DB.cards.every(c=>!c.locked),true,'unlock all removes every lock');
` },
  { name: "ignore", fixture: true, run: `(async()=>{
 let move=fixture(); const others=DB.cards.slice(1);
 assert.equal(placeDroppedCard(move,0,2,false,true),true);assert.equal(DB.cards.length,3);assert.equal(move.card.period,2);assert.equal(move.card.locked,true);assert.equal(DB.cards[1],others[0]);assert.equal(DB.cards[2],others[1],'manual Ignore retains every colliding card');
 move=fixture();generating=true;const before=JSON.stringify(DB);assert.equal(placeDroppedCard(move,0,2,false,true),false);assert.equal(JSON.stringify(DB),before,'Ignore disabled during automatic generation');generating=false;
 move=fixture();DB.classes[0].off['0-2']=true;assert.equal(placeDroppedCard(move,0,2,false,true),false,'Ignore does not bypass blocked periods');
 // All existing overlaps are locked: preserve them, but never add another overlap automatically.
 move=fixture();placeDroppedCard(move,0,2,false,true);DB.cards.forEach(c=>c.locked=true);DB.settings.periods=3;
 DB.lessons.push({id:'extra',classIds:['b'],teacherIds:['pj'],subjectId:'pj',group:'',len:1,perWeek:1});
 const locked=DB.cards.slice();const result=await attempt(buildCtx(0),locked,[{lessonId:'extra',len:1,diff:1}]);
 locked.forEach(c=>assert.equal(result.placed.includes(c),true));const added=result.placed.find(c=>c.lessonId==='extra');assert.ok(added);assert.notEqual(added.period,2);assert.equal(added.locked,false,'automatic placement avoids existing locked collisions');
 // Occupancy retains every locked teacher card, even after removing one overlapping entry.
 const ctx=buildCtx(0),occ=emptyOcc();locked.forEach(c=>occAdd(occ,ctx,c,1));occAdd(occ,ctx,locked[2],-1);assert.equal(conflicts(occ,ctx,'extra',1,0,2).includes(locked[0]),true);
 DB.rooms=[{id:'r',name:'Bilik'}];DB.lessons.forEach(l=>l.roomId='r');const roomCtx=buildCtx(0),roomOcc=emptyOcc();locked.forEach(c=>occAdd(roomOcc,roomCtx,c,1));occAdd(roomOcc,roomCtx,locked[2],-1);assert.equal(conflicts(roomOcc,roomCtx,'extra',1,0,2).includes(locked[1]),true,'removing one room overlap retains the others');
 // Actual generator rebuilds unlocked manual overlaps instead of retaining Ignore as an exemption.
 move=fixture();placeDroppedCard(move,0,2,false,true);DB.cards.forEach(c=>c.locked=false);DB.settings.periods=3;DB.settings.times=defaultTimes(3);checkData=()=>[];
 const actualAttempt=attempt;attempt=async(...args)=>{const r=await actualAttempt(...args);advance();return r;};
 await runGenerate(false);assert.equal(DB.cards.length,3);
 DB.cards.forEach(c=>{const occ=emptyOcc(),ctx=buildCtx(0);DB.cards.filter(x=>x!==c).forEach(x=>occAdd(occ,ctx,x,1));assert.equal(conflicts(occ,ctx,c.lessonId,c.len,c.day,c.period).length,0,'unlocked cards regenerated without conflicts');});
 move=fixture();placeDroppedCard(move,0,2,false,true);DB.cards.forEach(c=>c.locked=true);const saved=JSON.stringify(DB.cards);await runGenerate(false);assert.equal(JSON.stringify(DB.cards),saved,'fully locked overlaps survive generation');
 console.log('PASS: manual Ignore, no deletions, disabled during auto, blocked slots, locked preservation, unlocked auto cleanup, complete occupancy');
})()` }
];

async function main() {
  for (const suite of suites) {
    const context = createContext();
    if (suite.fixture) vm.runInContext(fixture, context);
    await vm.runInContext(suite.run, context, { filename: suite.name + '-suite' });
    console.log('PASS suite: ' + suite.name);
  }
  console.log('PASS: all ' + suites.length + ' suites completed');
}

const filterFixture = `
save=()=>{}; toast=()=>{}; render=()=>{};
DB=blank(); DB.settings.days=['Isnin','Selasa']; DB.settings.periods=10;
DB.settings.times=defaultTimes(10); DB.settings.sheetUrl=''; DB.settings.autoSync=false;
DB.classes=[{id:'a',name:'1A',off:{}},{id:'b',name:'1B',off:{}}];
DB.teachers=[{id:'t',name:'Guru A',off:{},maxDay:0}];
DB.subjects=[{id:'s',name:'Subjek',off:{}}];
DB.lessons=[{id:'a',classIds:['a'],teacherIds:['t'],subjectId:'s',len:1,perWeek:10},
{id:'b',classIds:['b'],teacherIds:['t'],subjectId:'s',len:1,perWeek:10}];
function occupied(cards){const ctx=buildCtx(0),occ=emptyOcc();cards.forEach(c=>occAdd(occ,ctx,c,1));return {ctx,occ};}
`;
suites.push(
  {name:'daily maximum',run:filterFixture+`
DB.settings.teacherFilters.maxEnabled=true;DB.settings.teacherFilters.maxDay=4;
let {ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:4}]);
assert.equal(softOk(occ,ctx,'b',1,0,5),false);
assert.equal(softOk(occ,ctx,'b',1,1,0),true);
DB.teachers[0].maxDay=2;({ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:2}]));
assert.equal(softOk(occ,ctx,'b',1,0,5),false);
`},
  {name:'daily minimum',run:filterFixture+`
DB.settings.teacherFilters.minEnabled=true;DB.settings.teacherFilters.minDay=2;
const ctx=buildCtx(0),cards=[{lessonId:'a',day:0,period:0,len:2},{lessonId:'b',day:1,period:0,len:1}];
assert.equal(teacherFilterIssues(ctx,cards).length,1);
cards[1].len=2;assert.equal(teacherFilterIssues(ctx,cards).length,0);
cards.pop();assert.equal(teacherFilterIssues(ctx,cards).length,1);
for(let p=0;p<10;p++)ctx.tMap.t.off['1-'+p]=true;
assert.equal(teacherFilterIssues(ctx,cards).length,0);
`},
  {name:'four consecutive and one rest',run:filterFixture+`
Object.assign(DB.settings.teacherFilters,{consecutiveEnabled:true,consecutiveMax:4,consecutiveRest:1});
const {ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:4}]);
assert.equal(softOk(occ,ctx,'b',1,0,4),false);
assert.equal(softOk(occ,ctx,'b',1,0,5),true);
assert.equal(softOk(emptyOcc(),ctx,'b',5,0,0),false);
`},
  {name:'adjustable consecutive rest',run:filterFixture+`
Object.assign(DB.settings.teacherFilters,{consecutiveEnabled:true,consecutiveMax:4,consecutiveRest:2});
const {ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:4}]);
assert.equal(softOk(occ,ctx,'b',1,0,5),false);
assert.equal(softOk(occ,ctx,'b',1,0,6),true);
ctx.breaks.add(3);assert.equal(softOk(occ,ctx,'b',1,0,4),false);
`},
  {name:'one rest before another class',run:filterFixture+`
Object.assign(DB.settings.teacherFilters,{restEnabled:true,classRest:1});
let {ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:2}]);
assert.equal(softOk(occ,ctx,'b',1,0,2),false);
assert.equal(softOk(occ,ctx,'b',1,0,3),true);
assert.equal(softOk(occ,ctx,'a',1,0,2),true);
({ctx,occ}=occupied([{lessonId:'a',day:0,period:3,len:2}]));
assert.equal(softOk(occ,ctx,'b',1,0,2),false);
assert.equal(softOk(occ,ctx,'b',1,0,1),true);
`},
  {name:'disabled filters',run:filterFixture+`
Object.assign(DB.settings.teacherFilters,{minDay:8,maxDay:1,consecutiveMax:1,classRest:3});
const {ctx,occ}=occupied([{lessonId:'a',day:0,period:0,len:4}]);
assert.equal(softOk(occ,ctx,'b',1,0,4),true);
assert.equal(teacherFilterIssues(ctx,[{lessonId:'a',day:0,period:0,len:4}]).length,0);
`},
  {name:'impossible minimum and invalid inputs',run:filterFixture+`
Object.assign(DB.settings.teacherFilters,{minEnabled:true,minDay:2});
DB.lessons[0].perWeek=1;DB.lessons[1].perWeek=1;
assert.equal(filterFeasibilityErrors(buildCtx(0)).length,1);
Object.assign(DB.settings.teacherFilters,{maxEnabled:true,maxDay:1});
assert.ok(filterInputErrors(DB.settings.teacherFilters).length>0);
DB.settings.teacherFilters.minDay=1.5;assert.ok(filterInputErrors(DB.settings.teacherFilters).length>0);
`},
  {name:'actual generation with filters',run:filterFixture+`(async()=>{
DB.lessons[0].perWeek=2;DB.lessons[1].perWeek=2;
Object.assign(DB.settings.teacherFilters,{minEnabled:true,minDay:2,maxEnabled:true,maxDay:2,consecutiveEnabled:true,consecutiveMax:4,consecutiveRest:1,restEnabled:true,classRest:1});
const ctx=buildCtx(0),units=DB.lessons.flatMap(l=>splitUnits(l).map(len=>({lessonId:l.id,len,diff:1})));
const result=await attempt(ctx,[],units);
assert.equal(result.missing,0);assert.equal(result.filterIssues.length,0);
for(let d=0;d<2;d++)assert.equal(result.placed.filter(c=>c.day===d).reduce((n,c)=>n+c.len,0),2);
})()`}
);

main().catch(error => { console.error(error); process.exitCode = 1; });
