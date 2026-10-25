const { readFileSync } = require('node:fs');const vm = require('node:vm');const assert = require('node:assert/strict');
const el = {addEventListener(){},classList:{add(){},remove(){}}, querySelector(){}, textContent:''};
const context = vm.createContext({console,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return el},querySelectorAll(){return []},addEventListener(){}},window:{addEventListener(){}},navigator:{},location:{protocol:'file:'},setTimeout(){},clearTimeout(){},URLSearchParams,URL,Blob,assert});
vm.runInContext(readFileSync(__dirname+'/index.html','utf8').split('<script>')[1].split('</script>')[0].split('(function start()')[0],context);
vm.runInContext(`
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
`,context);
console.log('PASS: kelas gabung subjek sama boleh serentak, tidak dikira terlebih waktu');
