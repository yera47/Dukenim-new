import {describe,expect,it} from "vitest";
import {productAnalyticsEvent} from "../../shared/product-analytics";

describe("privacy-safe product analytics contract",()=>{
  it("normalizes a tap independently of viewport size",()=>{
    const event=productAnalyticsEvent({eventKind:"action",platform:"web",surface:"merchant",sessionId:"session-1",screenId:"merchant.analytics",actionId:"period.7d",layoutVersion:"analytics-v1",viewportWidth:390,viewportHeight:844,x:195,y:422});
    expect(event).toMatchObject({x_milli:500,y_milli:500,screen_id:"merchant.analytics",action_id:"period.7d"});
  });
  it("rejects free text identifiers and invalid dimensions",()=>{
    expect(productAnalyticsEvent({eventKind:"screen_view",platform:"ios",surface:"merchant",sessionId:"session-1",screenId:"email=user@example.com",layoutVersion:"v1",viewportWidth:390,viewportHeight:844})).toBeNull();
    expect(productAnalyticsEvent({eventKind:"screen_view",platform:"ios",surface:"merchant",sessionId:"session-1",screenId:"merchant.home",layoutVersion:"v1",viewportWidth:0,viewportHeight:844})).toBeNull();
  });
});
