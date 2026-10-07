import React from"react";
import{renderToStaticMarkup}from"react-dom/server";
import{afterEach,describe,expect,it,vi}from"vitest";
import{startMonotonicTrialTicker,trialClockDisplay}from"@/lib/trial-clock";
import{TrialTimer}from"./trial-timer";

describe("TrialTimer server hydration and browser-clock drift",()=>{
  afterEach(()=>vi.useRealTimers());
  it("hydrates from the exact server timestamp instead of the browser wall clock",()=>{
    const serverNow=Date.parse("2026-10-07T12:00:00Z"),endsAt=new Date(serverNow+2*60*60_000).toISOString();
    vi.spyOn(Date,"now").mockReturnValue(Date.parse("2035-01-01T00:00:00Z"));
    const html=renderToStaticMarkup(<TrialTimer endsAt={endsAt} serverNow={serverNow}/>);
    expect(html).toContain(trialClockDisplay({status:"trial",endsAt,nowMs:serverNow}).fullLabel);
    vi.restoreAllMocks();
  });
  it("uses fake browser intervals plus monotonic elapsed time and ignores wall-clock jumps",()=>{
    vi.useFakeTimers();const serverNow=Date.parse("2026-10-07T12:00:00Z"),samples:number[]=[];let browserMonotonic=500;
    const id=startMonotonicTrialTicker({serverNow,monotonicNow:()=>browserMonotonic,publish:value=>samples.push(value),setInterval});
    expect(samples).toEqual([serverNow]);
    vi.setSystemTime(Date.parse("2040-01-01T00:00:00Z"));browserMonotonic+=30_000;vi.advanceTimersByTime(30_000);
    expect(samples.at(-1)).toBe(serverNow+30_000);
    browserMonotonic+=90_000;vi.advanceTimersByTime(30_000);
    expect(samples.at(-1)).toBe(serverNow+120_000);
    clearInterval(id);
  });
});
