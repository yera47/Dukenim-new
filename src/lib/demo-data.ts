export type Product = { id:string; title:string; description:string; price:number; oldPrice?:number; category:string; featured?:boolean; variants:{id:string;size:string|null;color:string;stock:number}[] };
export const tenant={name:"MEREY",slug:"demo-shop",tagline:"Вещи, которые остаются с вами",city:"Кызылорда",phone:"+7 777 000 00 00",whatsapp:"77000000000",accent:"#0E5C4A",plan:"standard" as const};
export const products:Product[]=[
 {id:"p1",title:"Жакет Essential",description:"Структурный жакет свободного кроя из плотной костюмной ткани.",price:42900,oldPrice:49900,category:"Новинки",featured:true,variants:[{id:"v1",size:"S",color:"Графит",stock:4},{id:"v2",size:"M",color:"Графит",stock:2},{id:"v3",size:"L",color:"Графит",stock:0}]},
 {id:"p2",title:"Платье Line",description:"Минималистичное платье миди с мягким силуэтом.",price:35900,category:"Платья",featured:true,variants:[{id:"v4",size:"S",color:"Молочный",stock:6},{id:"v5",size:"M",color:"Молочный",stock:3}]},
 {id:"p3",title:"Брюки Wide",description:"Широкие брюки с высокой посадкой и идеальной длиной.",price:28900,category:"Брюки",variants:[{id:"v6",size:"S",color:"Черный",stock:7},{id:"v7",size:"M",color:"Черный",stock:1},{id:"v8",size:"L",color:"Черный",stock:2}]},
 {id:"p4",title:"Рубашка Air",description:"Легкая хлопковая рубашка на каждый день.",price:22900,category:"Рубашки",variants:[{id:"v9",size:"S/M",color:"Белый",stock:8},{id:"v10",size:"M/L",color:"Белый",stock:5}]},
];
export const money=(value:number)=>new Intl.NumberFormat("ru-KZ").format(value)+" ₸";
export const orders=[
 {id:"1042",name:"Алина",total:71700,status:"Новый",source:"online",date:"Сегодня, 14:32"},
 {id:"1041",name:"Дана",total:35900,status:"Собирается",source:"online",date:"Сегодня, 12:10"},
 {id:"1040",name:"Продажа в зале",total:28900,status:"Готов",source:"offline",date:"Сегодня, 10:45"},
];
