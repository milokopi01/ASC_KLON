const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const el = { addEventListener(){}, classList:{add(){},remove(){}}, textContent:'' };
const context = vm.createContext({ console, assert, localStorage:{getItem(){return null},setItem(){}}, document:{querySelector(){return el},querySelectorAll(){return []},addEventListener(){}}, window:{addEventListener(){}}, navigator:{}, location:{protocol:'file:'}, setTimeout(){}, clearTimeout(){}, URLSearchParams, URL, Blob });
vm.runInContext(readFileSync(__dirname+'/index.html','utf8').split('<script>')[1].split('</script>')[0].split('(function start()')[0],context);
vm.runInContext(`
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
let move=fixture();
assert.deepEqual(Array.from(canDrop('pjA',1,0,2,move.card).collisions,c=>c.lessonId),['kmA','pjB'],'PJ onto KM also finds its teacher in another class');
let before=JSON.stringify(DB); assert.equal(placeDroppedCard(move,0,2),false); assert.equal(JSON.stringify(DB),before,'without approval no cards move or disappear');
assert.equal(placeDroppedCard(move,0,2,true),true); assert.equal(DB.cards.length,1); assert.equal(move.card.period,2); assert.equal(move.card.locked,true,'approval removes both collisions and places PJ');
assert.equal(DB.lessons.length,3); assert.equal(unplacedFor('class','a').some(x=>x.l.id==='kmA'),true); assert.equal(unplacedFor('class','b').some(x=>x.l.id==='pjB'),true,'removed cards return to unplaced lessons');
move=fixture(); DB.classes[0].off['0-2']=true; before=JSON.stringify(DB); assert.equal(placeDroppedCard(move,0,2,true),false); assert.equal(JSON.stringify(DB),before,'approval cannot bypass blocked times');
move=fixture(); DB.cards[2].period=1; DB.cards[2].len=2; assert.equal(canDrop('pjA',1,0,2,move.card).collisions.length,2,'teacher clashes across multi-period cards are detected');
move=fixture(); DB.cards.push({...DB.cards[2]}); assert.equal(canDrop('pjA',1,0,2,move.card).collisions.length,3,'all colliding cards are listed');
move=fixture(); DB.cards.shift(); assert.equal(placeDroppedCard({card:null,lessonId:'pjA',len:1},0,2,true),true); assert.equal(DB.cards[0].lessonId,'pjA','unplaced cards use the same confirmation rules');
`,context);
console.log('PASS: PJ/KM and cross-class teacher conflicts, confirmation, unplaced recovery, blocked slots, multi-period and all-card detection');