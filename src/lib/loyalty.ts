import { z } from "zod";

export const loyaltyRuleSchema = z.object({
  id: z.string().uuid(),
  trigger: z.enum(["orders", "product", "spend", "referral"]),
  threshold: z.number().int().min(1).max(10000000),
  category: z.string().trim().max(80),
  reward: z.enum(["gift", "percent", "fixed", "cashback"]),
  label: z.string().trim().min(2, "Назовите награду").max(100),
  value: z.number().int().min(1).max(10000000),
  minOrder: z.number().int().min(0).max(999999999),
  expiryDays: z.number().int().min(0).max(365),
  repeat: z.boolean(),
  earnOnReward: z.boolean(),
  giftVariantId:z.string().uuid().nullable().optional(),
}).strict().superRefine((rule, ctx) => {
  if (rule.trigger === "product" && !rule.category) ctx.addIssue({code:"custom", path:["category"], message:"Укажите категорию товаров"});
  if (["percent", "cashback"].includes(rule.reward) && rule.value > 100) ctx.addIssue({code:"custom",path:["value"],message:"Процент — от 1 до 100"});
  if (rule.reward === "cashback" && (rule.trigger !== "orders" || rule.threshold !== 1)) ctx.addIssue({code:"custom",path:["reward"],message:"Кешбэк начисляется после каждого оплаченного заказа"});
});
export const loyaltyProgramSchema = z.object({
  name:z.string().trim().min(2).max(60), enabled:z.boolean(), terms:z.string().trim().max(1200),
  rules:z.array(loyaltyRuleSchema).min(1).max(8),
}).strict().refine(program => new Set(program.rules.map(rule=>rule.id)).size === program.rules.length, "Правила не должны повторяться");
export type LoyaltyRule = z.infer<typeof loyaltyRuleSchema>;
export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;
export type LoyaltyReward = {ruleId:string;milestone:number;reward:LoyaltyRule["reward"];label:string;value:number;expiresAt:string|null};
export type LoyaltyProgress = {rule:LoyaltyRule;active:boolean;progress:number;available:LoyaltyReward|null};
export function newLoyaltyRule():LoyaltyRule {
  return {id:crypto.randomUUID(),trigger:"orders",threshold:6,category:"",reward:"gift",label:"Кофе в подарок",value:1,minOrder:0,expiryDays:0,repeat:true,earnOnReward:false,giftVariantId:null};
}
export function newLoyaltyProgram():LoyaltyProgram {return {name:"Клуб гостей",enabled:true,terms:"",rules:[newLoyaltyRule()]};}
function countWord(value:number,one:string,few:string,many:string){const last=value%10;return value%100>=11&&value%100<=14?many:last===1?one:last>=2&&last<=4?few:many;}
export function ruleDescription(rule:LoyaltyRule) {
  const condition = rule.trigger === "orders" ? `${rule.threshold} ${countWord(rule.threshold,"оплаченный заказ","оплаченных заказа","оплаченных заказов")}` : rule.trigger === "product" ? `${rule.threshold} ${countWord(rule.threshold,"товар","товара","товаров")} из категории «${rule.category}»` : rule.trigger === "spend" ? `${rule.threshold.toLocaleString("ru-RU")} ₸ покупок` : `${rule.threshold} ${countWord(rule.threshold,"друг","друга","друзей")} с первым оплаченным заказом`;
  const reward = rule.reward === "gift" ? rule.label : rule.reward === "percent" ? `скидка ${rule.value}%` : rule.reward === "fixed" ? `скидка ${rule.value.toLocaleString("ru-RU")} ₸` : `${rule.value}% от покупки на следующий заказ`;
  return `${condition} → ${reward}`;
}
export function rewardDiscount(reward:LoyaltyReward|null, subtotal:number) {
  if(!reward || reward.reward === "gift") return 0;
  return Math.min(subtotal,reward.reward === "percent" ? Math.floor(subtotal*reward.value/100) : reward.value);
}
