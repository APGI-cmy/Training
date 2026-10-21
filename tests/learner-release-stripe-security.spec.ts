import {afterEach,describe,it,expect,vi} from "vitest";
import {createHmac,randomBytes} from "node:crypto";
import {sealStripe,openStripe,validateTestCredentials,verifyStripeSignature,stripeRoute,stripeRedirect} from "@/lib/stripe-payments";
import {settledAllocation} from "@/lib/stripe-settlement";
import {notificationTarget} from "@/lib/notifications";
afterEach(()=>vi.unstubAllEnvs());
describe("Stripe secret storage and sandbox boundary",()=>{
 it("encrypts credentials with authenticated encryption and unique IVs",()=>{vi.stubEnv("ALP_STRIPE_SETUP_KEY",randomBytes(32).toString("base64"));const secret={key:"rk_test_private",webhook:"whsec_private"},one=sealStripe(secret),two=sealStripe(secret);expect(one).not.toBe(two);expect(one).not.toContain(secret.key);expect(openStripe(one)).toEqual(secret);const pieces=one.split(".");pieces[2]=(pieces[2][0]==="a"?"b":"a")+pieces[2].slice(1);expect(()=>openStripe(pieces.join("."))).toThrow();});
 it("cannot decrypt with a different master key",()=>{vi.stubEnv("ALP_STRIPE_SETUP_KEY",randomBytes(32).toString("base64"));const value=sealStripe({key:"private"});vi.stubEnv("ALP_STRIPE_SETUP_KEY",randomBytes(32).toString("base64"));expect(()=>openStripe(value)).toThrow();});
 it.each(["rk_live_abcdefghijklmnopqrst","sk_live_abcdefghijklmnopqrst","sk_test_abcdefghijklmnopqrst",""])("rejects live or unrestricted credential %s",key=>{expect(()=>validateTestCredentials(key,"whsec_abcdefghijklmnopqrst")).toThrow();});
 it("accepts only a restricted test key with a signing secret",()=>expect(()=>validateTestCredentials("rk_test_abcdefghijklmnopqrst","whsec_abcdefghijklmnopqrst")).not.toThrow());
 it("checks the raw body, signature and replay timestamp",()=>{const body='{"id":"evt_test"}',secret="testsecret",t=1000000,signature=createHmac("sha256",secret).update(`${t}.${body}`).digest("hex"),header=`t=${t},v1=${signature}`;expect(()=>verifyStripeSignature(body,header,secret,t*1000)).not.toThrow();expect(()=>verifyStripeSignature(body+" ",header,secret,t*1000)).toThrow();expect(()=>verifyStripeSignature(body,header,secret,(t+301)*1000)).toThrow();expect(()=>verifyStripeSignature(body,`t=${t},v1=00`,secret,t*1000)).toThrow();});
 it("holds unsupported cross-border routes",()=>{expect(stripeRoute("CA")).toBe("stripe");expect(stripeRoute("GB")).toBe("stripe");expect(stripeRoute("ZA")).toBe("alternative_required");});
 it("does not follow a spoofed Stripe redirect",()=>{expect(()=>stripeRedirect("https://checkout.stripe.com.evil.test/x","checkout")).toThrow();expect(()=>stripeRedirect("http://connect.stripe.com/x","connect")).toThrow();});
 it("allows the private setup notification target without allowing arbitrary admin routes",()=>{expect(notificationTarget("/admin/payments/stripe/private")).toBe("/admin/payments/stripe/private");expect(notificationTarget("/admin/payments/stripe/private/secret")).toBe("/notifications");});
});
describe("Confirmed-fee cost sharing",()=>{
 const input={hostingFixedCents:100,hostingRateBps:0,stripeFixedCents:30,stripeRateBps:300,administrationBps:600,contingencyBps:1000,minimumApgiCents:1,apgiShareBps:4000,recoveryBps:2500,outstandingCents:500};
 it("uses the actual fee once, balances every cent and caps recovery",()=>{const a=settledAllocation(10000,432,input);expect(a.costs).toBe(532);expect(a.recovery).toBe(500);expect(a.costs+a.administration+a.contingency+a.recovery+a.apgi+a.partner).toBe(10000);});
 it("stops recovery when the outstanding balance reaches zero",()=>expect(settledAllocation(10000,200,{...input,outstandingCents:0}).recovery).toBe(0));
 it("holds an actual fee that breaches the approved minimum",()=>expect(()=>settledAllocation(100,99,input)).toThrow());
 it.each([-1,0.5,10001])("rejects invalid processor fee %s",fee=>expect(()=>settledAllocation(10000,fee,input)).toThrow());
});
