"use client";
import {useActionState,useEffect,useState} from "react";
import Link from "next/link";
import {acceptInvitation,registerStaff} from "./actions";
export default function JoinTeam(){
 const[token,setToken]=useState("");const[state,action,pending]=useActionState(acceptInvitation,{});
 const[registration,register,registering]=useActionState(registerStaff,{});
 useEffect(()=>{setToken(window.location.hash.slice(1));},[]);
 return <main className="mx-auto max-w-lg space-y-5 p-8"><h1 className="text-3xl font-semibold">Присоединиться к команде</h1><p>Приглашение привязано к вашему email. Владелец определяет, какие разделы магазина вам доступны.</p><Link href="/login" className="underline">Войти в аккаунт</Link><details><summary className="cursor-pointer">Нет аккаунта? Создать аккаунт сотрудника</summary><form action={register} className="mt-4 space-y-3"><label className="block">Email приглашения<input required type="email" name="email" autoComplete="email" className="block w-full rounded-xl border p-3"/></label><label className="block">Новый пароль<input required type="password" name="password" minLength={10} maxLength={128} autoComplete="new-password" className="block w-full rounded-xl border p-3"/></label><button disabled={registering} className="rounded-xl border p-3">{registering?"Отправляем…":"Зарегистрироваться"}</button>{registration.error&&<p role="alert">{registration.error}</p>}{registration.success&&<p role="status">{registration.success}</p>}</form></details><form action={action}><input type="hidden" name="token" value={token}/><button disabled={pending||!token} className="rounded-xl bg-neutral-900 p-3 text-white">{pending?"Проверяем…":"Принять приглашение"}</button>{state.error&&<p role="alert" className="mt-4">{state.error}</p>}</form></main>;
}
