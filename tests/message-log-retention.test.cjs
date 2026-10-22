const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {pruneMessageLogs}=require('../dist/services/message-log-retention');

test('cleanup commits finite batches and releases its connection',async()=>{
 const calls=[];let released=false;
 const client={query:async sql=>{calls.push(sql);return {rows:[{acquired:true}]};},release:()=>{released=true;}};
 await pruneMessageLogs({connect:async()=>client});
 assert.equal(calls[0],'BEGIN');assert.equal(calls.at(-1),'COMMIT');assert.equal(released,true);
 for(const sql of calls.filter(s=>s.startsWith('DELETE')||s.startsWith('UPDATE')))assert.match(sql,/LIMIT 5000/);
 assert.match(calls.join('\n'),/interval '7 days'/);assert.match(calls.join('\n'),/interval '30 days'/);
});
test('competing cleanup skips and failures roll back without leaking connections',async()=>{
 const calls=[];let released=0;
 const client={query:async sql=>{calls.push(sql);return {rows:[{acquired:false}]};},release:()=>released++};
 await pruneMessageLogs({connect:async()=>client});assert.equal(calls.length,3);assert.equal(released,1);
 client.query=async sql=>{calls.push(sql);if(sql.startsWith('UPDATE'))throw Error('temporary');return {rows:[{acquired:true}]};};
 await assert.rejects(()=>pruneMessageLogs({connect:async()=>client}),/temporary/);assert.equal(calls.at(-1),'ROLLBACK');assert.equal(released,2);
});
test('gateway sends the actual text but persists only hash/size and delivery metadata',async()=>{
 const writes=[],sent=[];let rejectSend=false;
 const exports={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/services/app.service'),'utf8'),{
  exports,Buffer,console:{error:()=>{}},require:id=>{
   if(id==='../applications/app')return {getClient:()=>({sendMessage:async(to,text)=>{sent.push({to,text});if(rejectSend)throw Error('private payload');return {id:{id:'WA-test'},timestamp:1};}})};
   if(id==='../applications/database')return {getPool:()=>({query:async(sql,args)=>{writes.push({sql,args});return {rows:[]};}})};
   if(id==='../utils/phone.util')return {formatToWhatsAppJid:()=>({isValid:true,jid:'628123456789@c.us',formattedNumber:'628123456789'})};
   if(id==='node:crypto')return require(id);throw Error(id);
  }
 });
 await exports.default.send({to:'628123456789',message:'  private payload  '});
 assert.equal(sent[0].text,'private payload');assert.equal(writes[0].args.includes('  private payload  '),false);
 assert.match(writes[0].sql,/VALUES \(\$1, ''/);assert.equal(writes[0].args.some(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)),true);
 rejectSend=true;await assert.rejects(()=>exports.default.send({to:'628123456789',message:'private payload'}));
 assert.equal(writes[1].args.includes('private payload'),false);assert.equal(writes[1].args.includes('whatsapp_send_failed'),true);
});
