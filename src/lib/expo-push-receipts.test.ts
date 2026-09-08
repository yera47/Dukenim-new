import {expect,it} from 'vitest';
import {readPushTickets,readPushReceipts} from './expo-push-receipts';
const devices=[{id:'11111111-1111-4111-8111-111111111111'},{id:'22222222-2222-4222-8222-222222222222'}];
const tickets=[{id:'ticket1',deviceId:devices[0].id},{id:'ticket2',deviceId:devices[1].id}];
it('preserves accepted tickets in a partially rejected batch',()=>{
  expect(readPushTickets({data:[{status:'ok',id:'ticket1'},{status:'error',details:{error:'DeviceNotRegistered'}}]},devices)).toEqual({tickets:[tickets[0]],invalid:[devices[1].id],partial:true});
});
it('rejects mismatched provider batches',()=>expect(()=>readPushTickets({data:[]},devices)).toThrow());
it('never interprets missing receipts as confirmed',()=>{
  expect(readPushReceipts({data:{}},tickets,false).state).toBe('pending');
  expect(readPushReceipts({data:{}},tickets,true).state).toBe('unknown');
});
it('requires all receipts to be ok',()=>{
  expect(readPushReceipts({data:{ticket1:{status:'ok'},ticket2:{status:'ok'}}},tickets,false).state).toBe('accepted');
  expect(readPushReceipts({data:{ticket1:{status:'ok'},ticket2:{status:'error',details:{error:'DeviceNotRegistered'}}}},tickets,false)).toEqual({state:'failed',invalid:[devices[1].id]});
});
