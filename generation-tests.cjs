const {readFileSync}=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const els={}; const get=s=>els[s]||(els[s]={value:s==='#g_time'?'2':'0',style:{},classList:{add(){},remove(){}},addEventListener(){}});
let clock=0;const c=vm.createContext({console,assert,performance:{now:()=>clock},advance:()=>clock+=1000,localStorage:{getItem(){return null},setItem(){}},document:{querySelector:get,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},navigator:{},location:{protocol:'file:'},setTimeout,clearTimeout,URLSearchParams,URL,Blob,confirm:()=>true});
vm.runInContext(readFileSync(__dirname+'/index.html','utf8').split('<script>')[1].split('</script>')[0].split('(function start()')[0],c);
vm.runInContext(`(async()=>{
 toast=()=>{}; checkData=()=>[]; DB=demo(); DB.settings.autoSync=false;
 let calls=0; attempt=async()=>{calls++;advance();if(calls===5)stopGenerate();return {placed:[],missing:999}};
 await runGenerate(true); assert.equal(calls,5,'continuous mode must exceed 2-second time limit'); assert.equal(generating,false);
 calls=0; await runGenerate(false); assert.equal(calls,2,'timed mode must stop at 2 seconds');
 const card={lessonId:DB.lessons[0].id,day:0,period:0,len:1,locked:true}; DB.cards=[card];
 attempt=async()=>{stopGenerate();return {placed:[],missing:999}}; await runGenerate(true);assert.equal(DB.cards[0],card,'manual stop preserves locked and best cards');
 console.log('PASS: continuous mode, timed mode, manual stop preserves best timetable');
})()`,c).catch(e=>{console.error(e);process.exitCode=1});
