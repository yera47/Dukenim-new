import {describe,expect,it} from "vitest";
import {DOOR_ENTRY_MS,DOOR_EXIT_MS,DOOR_REDUCED_MS,doorDuration,doorMotionPlan,shouldDismissDoorMotion,shouldPlayDoorEntry} from "./brand-door-policy";

describe("D door motion policy",()=>{
  it("plays only when entering the workspace, never between tabs or auth forms",()=>{
    expect(shouldPlayDoorEntry("/","/more")).toBe(true);
    expect(shouldPlayDoorEntry("/auth-callback","/more")).toBe(true);
    expect(shouldPlayDoorEntry("/forgot-password","/root")).toBe(true);
    expect(shouldPlayDoorEntry("/more","/menu")).toBe(false);
    expect(shouldPlayDoorEntry("/more","/more")).toBe(false);
    expect(shouldPlayDoorEntry("/","/login")).toBe(false);
    expect(shouldPlayDoorEntry("/","/register")).toBe(false);
  });
  it("uses a short static reveal for Reduced Motion and stays within the 1.5 second budget",()=>{
    expect(doorDuration("entry",true)).toBe(DOOR_REDUCED_MS);
    expect(doorDuration("exit",true)).toBe(DOOR_REDUCED_MS);
    expect(doorDuration("entry",false)).toBe(DOOR_ENTRY_MS);
    expect(doorDuration("exit",false)).toBe(DOOR_EXIT_MS);
    expect(doorDuration("entry",false)).toBeLessThanOrEqual(1500);
    expect(doorDuration("exit",false)).toBeLessThanOrEqual(1500);
  });
  it("never captures input and disappears after each completed scene",()=>{
    expect(doorMotionPlan("entry",false)).toMatchObject({pointerEvents:"none",visibleAfterCompletion:false});
    expect(doorMotionPlan("exit",false)).toMatchObject({pointerEvents:"none",visibleAfterCompletion:false});
    expect(doorMotionPlan("entry",true).duration).toBe(DOOR_REDUCED_MS);
  });
  it("dismisses an active scene in background and does not replay it on foreground",()=>{
    expect(shouldDismissDoorMotion("background")).toBe(true);
    expect(shouldDismissDoorMotion("inactive")).toBe(true);
    expect(shouldDismissDoorMotion("active")).toBe(false);
    expect(shouldPlayDoorEntry("/more","/more")).toBe(false);
  });
});
