export function buyerOrderProgress(order:{status:string;delivery_method:string;reservation?:{status:string;expires_at:string}|null},now=Date.now()){
 const expired=order.reservation?.status==="expired"||Boolean(order.reservation&&["reserved","confirmed"].includes(order.reservation.status)&&Date.parse(order.reservation.expires_at)<=now);
 const closed=order.status==="cancelled"||order.reservation?.status==="cancelled"||expired;
 const pickup=order.delivery_method==="pickup";
 const ready=pickup&&(order.status==="assembled"||order.reservation?.status==="confirmed")&&!closed;
 const index=order.status==="done"?3:ready||order.status==="delivering"?2:order.status==="confirmed"||order.status==="assembled"?1:0;
 return {expired,closed,pickup,ready,index};
}
