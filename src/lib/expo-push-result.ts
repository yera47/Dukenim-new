export function expoAccepted(value:unknown, expected:number):boolean {
  if(!value||typeof value!=="object"||!("data" in value)||!Array.isArray(value.data)||expected<1||value.data.length!==expected)return false;
  return value.data.every(ticket=>ticket&&typeof ticket==="object"&&ticket.status==="ok"&&typeof ticket.id==="string"&&ticket.id.length>0);
}
