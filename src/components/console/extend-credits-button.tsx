"use client";
import { useState } from "react";
import { startCreditExtension } from "@/app/actions/credit-extension";
type Checkout = { open:()=>void };
type RazorpayConstructor = new (options:Record<string,unknown>)=>Checkout;
export function ExtendCreditsButton({lotId}:{lotId:string}) {
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function begin() {
  setBusy(true);setMessage("");
  try {
   const result=await startCreditExtension(lotId);
   if(result.error || !result.orderId || !result.keyId) {setMessage(result.error??"Payment order unavailable.");return;}
   const win=window as Window & {Razorpay?:RazorpayConstructor};
   if(!win.Razorpay) await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=()=>resolve();script.onerror=()=>reject(new Error("Payment checkout could not load."));document.head.appendChild(script);});
   if(!win.Razorpay) throw new Error("Payment checkout unavailable.");
   new win.Razorpay({key:result.keyId,order_id:result.orderId,amount:result.amountMinor,currency:result.currency,name:"Kaam Ki Lead",description:"₹500 for a 30-day credit extension (test payment)",handler:()=>setMessage("Payment submitted. Your extension is confirmed only after provider verification. Reload to check the expiry date."),modal:{ondismiss:()=>setMessage("Checkout closed. Reload to check whether any payment was confirmed.")}}).open();
  } catch {setMessage("The extension payment could not be started. Please try again.");} finally {setBusy(false);}
 }
 return <div><button type="button" disabled={busy} onClick={begin} className="mt-[8px] rounded border border-control-border px-[12px] py-[8px] font-semibold">{busy?"Preparing checkout…":"Pay ₹500 to extend 30 days (test)"}</button><p role="status">{message}</p></div>;
}
