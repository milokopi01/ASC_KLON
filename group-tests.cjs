const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const el = {addEventListener(){},classList:{add(){},remove(){}}, querySelector(){}, textContent:''};
const context = vm.createContext({console,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return el},querySelectorAll(){return []},addEventListener(){}},window:{addEventListener(){}},navigator:{},location:{protocol:'file:'},setTimeout(){},clearTimeout(){},URLSearchParams,URL,Blob,assert});
const code = readFileSync(__dirname+'/index.html','utf8').split('<script>')[1].split('</script>')[0].split('(function start()')[0];
vm.runInContext(code,context);
vm.runInContext(`
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
assert.equal(canDrop('b',2,0,0).ok,true,'PAI and PM groups may share the slot');
assert.equal(canDrop('w',1,0,0).ok,false,'entire-class lesson cannot overlap a group lesson');
assert.equal(canDrop('a',2,0,0,null).ok,false,'same group cannot double up');
assert.equal(classUnits(DB.classes[0]),3,'parallel groups count once toward class load');
assert.equal(normGroup('Entire class'),'');
`,context);
console.log('PASS: parallel groups (PAI/PM) share slot, whole class still clashes');
