export type HolidayIdea={key:string;name:string;month:number;day:number;kind:"official"|"retail";hint:string};
// Fixed dates only. Moving and lunar holidays require a yearly source update.
export const holidayIdeas:HolidayIdea[]=[
 {key:"new-year",name:"Новый год",month:1,day:1,kind:"official",hint:"праздничная коллекция и удобные заказы заранее"},
 {key:"valentine",name:"14 февраля",month:2,day:14,kind:"retail",hint:"подарки и предложения для двоих"},
 {key:"women",name:"8 марта",month:3,day:8,kind:"official",hint:"подарки и тёплые поздравления"},
 {key:"nauryz",name:"Наурыз",month:3,day:21,kind:"official",hint:"весеннее обновление витрины"},
 {key:"unity",name:"День единства народа Казахстана",month:5,day:1,kind:"official",hint:"весенние подборки"},
 {key:"defender",name:"День защитника Отечества",month:5,day:7,kind:"official",hint:"подарочные подборки"},
 {key:"victory",name:"День Победы",month:5,day:9,kind:"official",hint:"сдержанное уважительное оформление"},
 {key:"children",name:"День защиты детей",month:6,day:1,kind:"retail",hint:"семейные подборки"},
 {key:"capital",name:"День столицы",month:7,day:6,kind:"official",hint:"локальные подборки"},
 {key:"school",name:"1 сентября",month:9,day:1,kind:"retail",hint:"удобные подборки к началу учебного года"},
 {key:"republic",name:"День Республики",month:10,day:25,kind:"official",hint:"сдержанное локальное оформление"},
 {key:"halloween",name:"Хэллоуин",month:10,day:31,kind:"retail",hint:"немного атмосферных деталей без перегруженного дизайна"},
 {key:"independence",name:"День Независимости Казахстана",month:12,day:16,kind:"official",hint:"уважительное оформление и локальные подборки"},
];
export function nextHolidayIdeas(now:Date,withinDays=7){
 const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
 return holidayIdeas.map(idea=>{let year=now.getFullYear();let date=Date.UTC(year,idea.month-1,idea.day);if(date<today){year++;date=Date.UTC(year,idea.month-1,idea.day);}return{...idea,year,daysUntil:Math.round((date-today)/86400000)};}).filter(idea=>idea.daysUntil<=withinDays).sort((a,b)=>a.daysUntil-b.daysUntil);
}
export function holidayDesignBrief(idea:HolidayIdea){return `Подготовь предложение оформления витрины к событию «${idea.name}». Идея: ${idea.hint}. Предложи согласованную палитру для всей витрины, аккуратные декоративные акценты, заголовок и текст главного экрана. Сохрани узнаваемость магазина. Не придумывай товары, цены, скидки, наличие или обещания доставки. Ничего не публикуй без подтверждения владельца.`;}
export function holidayPromotionBrief(idea:HolidayIdea){return `Подготовь текст необязательной кампании к событию «${idea.name}». Идея: ${idea.hint}. Не придумывай скидку, ассортимент, наличие, срок доставки или другие условия. Текст должен быть понятным и уместным для действующего магазина. Сначала покажи черновик владельцу.`;}
