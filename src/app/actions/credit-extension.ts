"use server";
import { callAs } from "@/lib/services/backend/session";
export async function startCreditExtension(lotId:string) {
 const {status,body}=await callAs<{error?:string;orderId?:string;keyId?:string;amountMinor?:number;currency?:string}>("seller","/v1/wallet/extensions",{method:"POST",body:{lotId}});
 if(status!==201) return {error:body.error??"Extension payment could not be started."};
 return body;
}
