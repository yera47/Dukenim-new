export type PaymentRequest={amount:number;currency:"KZT";description:string;reference:string};
export type PaymentResult={success:boolean;paymentId:string;status:"paid"|"failed"};
export async function processPayment(request:PaymentRequest):Promise<PaymentResult>{
  // KASPI INTEGRATION POINT: replace only this mock body with the real provider call.
  // Never accept or store raw card data in this application.
  await new Promise(resolve=>setTimeout(resolve,700));
  return{success:request.amount>0,paymentId:`mock_${request.reference}_${Date.now()}`,status:request.amount>0?"paid":"failed"};
}
