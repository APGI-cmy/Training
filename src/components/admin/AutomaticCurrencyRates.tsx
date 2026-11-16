"use client";
import { useEffect, useId, useRef, useState } from "react";
import { currencies, currencyEquivalent, exchangeRate, exchangeSource, validateExchangeQuote, type ExchangeQuote } from "@/lib/currency-rates";
import { newServiceSelection,type ServiceSelection } from "@/lib/service-costs";

export function ExchangeRateReference(){
  const [selection,setSelection]=useState(()=>newServiceSelection());
  return <AutomaticCurrencyRates selection={selection} currency="USD" onChange={patch=>setSelection(current=>({...current,...patch,reviewed:false}))}/>;
}

export function CurrencyEquivalents({amount,from,quote}:{amount:string;from:string;quote?:ExchangeQuote|null}){
  if(!quote)return null;
  try{validateExchangeQuote(quote);return <span>{["USD","CAD","ZAR"].filter(c=>c!==from).map(c=>`${c} ${currencyEquivalent(amount,quote,from,c)}`).join(" · ")}</span>;}catch{return null;}
}
export function AutomaticCurrencyRates({selection,currency,onChange}:{selection:ServiceSelection;currency:string;onChange:(patch:Partial<ServiceSelection>)=>void}){
  const [latest,setLatest]=useState<ExchangeQuote>();
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  const [usd,setUsd]=useState("1");const id=useId();
  const current=useRef({selection,currency,onChange});
  useEffect(()=>{current.current={selection,currency,onChange};},[selection,currency,onChange]);
  const apply=(quote:ExchangeQuote)=>{
    const c=current.current;
    c.onChange({fxMode:"auto",fxQuote:quote,usdFx:exchangeRate(quote,"USD",c.currency),cadFx:exchangeRate(quote,"CAD",c.currency)});
  };
  async function load(signal?:AbortSignal){
    setPending(true);setError("");
    try{
      const response=await fetch("/api/admin/currency-rates",{cache:"no-store",signal});
      const data=await response.json();if(!response.ok)throw Error(data.error||"The exchange rates could not be retrieved.");
      const quote=validateExchangeQuote(data.quote);if(signal?.aborted)return;
      setLatest(quote);
      const c=current.current;
      if(c.selection.fxMode==="auto"&&(c.selection.fxQuote?.date!==quote.date||JSON.stringify(c.selection.fxQuote?.cadPerUnit)!==JSON.stringify(quote.cadPerUnit)))apply(quote);
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"The latest rates could not be retrieved. Please retry.");}
    finally{if(!signal?.aborted)setPending(false);}
  }
  useEffect(()=>{
    const controller=new AbortController();void load(controller.signal);
    const timer=window.setInterval(()=>{void load(controller.signal);},3600000);
    return()=>{controller.abort();window.clearInterval(timer);};
    // Read current form inputs when the asynchronous request finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const auto=selection.fxMode==="auto";
  let quote:ExchangeQuote|undefined;
  try{quote=validateExchangeQuote(auto?selection.fxQuote:latest);if(latest?.date===quote.date&&JSON.stringify(latest.cadPerUnit)===JSON.stringify(quote.cadPerUnit))quote=latest;}catch{/* An expired quote is never displayed as current. */}
  return <section className="service-breakdown currency-panel" aria-label="Automatic currency conversion">
    <h4>USD, Canadian dollars and South African rand</h4>
    <p><a href={exchangeSource} target="_blank" rel="noopener noreferrer">Bank of Canada daily reference rates ↗</a>. Updated automatically when this page opens and hourly while it stays open. New rates reset the estimate review tickbox; saved agreements keep their original rates.</p>
    <div className="planning-controls"><button type="button" className="secondary-button" disabled={pending} onClick={()=>void load()}>{pending?"Checking exchange rates…":"Refresh exchange rates"}</button>
      {!auto?<button type="button" disabled={!latest||pending} onClick={()=>latest&&apply(latest)}>Use automatic exchange rates</button>:null}
    </div>
    {!auto?<p className="notice-card">Your earlier manual exchange rates have been retained. Choose automatic rates to fill these fields from the published source.</p>:null}
    {error?<p role="status" className="form-error">{error}{quote?` The dated ${quote.date} reference remains in use; it was not replaced.`:" No exchange rate is assumed."}</p>:null}
    {quote?<>
      <p className="field-hint">Published {quote.date} · checked {new Date(quote.checkedAt).toLocaleString("en-GB",{timeZone:"Africa/Johannesburg"})} (South African time). Daily reference rates, not a guaranteed bank or Stripe settlement quote.</p>
      <div className="admin-form-grid">
        <label className="planning-field" htmlFor={id}>Amount in USD<input id={id} inputMode="decimal" value={usd} maxLength={18} onChange={e=>setUsd(e.target.value)} title="Enter a USD amount to see CAD and rand equivalents immediately. This converter does not change the course price."/></label>
        <div className="currency-output" role="status" aria-live="polite"><strong>CAD {currencyEquivalent(usd,quote,"USD","CAD")}</strong><strong>ZAR {currencyEquivalent(usd,quote,"USD","ZAR")}</strong></div>
      </div>
      {auto?<p>Calculated exchange rates: USD 1 = {exchangeRate(quote,"USD",currency)} {currency}; CAD 1 = {exchangeRate(quote,"CAD",currency)} {currency}. Filled automatically for service costs and Stripe’s CAD fixed fee.</p>:null}
      <details><summary>View currency reference table</summary><div className="service-table-wrap"><table><thead><tr><th>Currency</th><th>One USD buys</th></tr></thead><tbody>{currencies.map(c=><tr key={c}><th scope="row">{c}</th><td>{exchangeRate(quote!,"USD",c)}</td></tr>)}</tbody></table></div></details>
    </>:<p role="status">{pending?"Loading the latest published exchange rates…":"Automatic rates are required before this estimate can be reviewed. Retry the refresh when the source is available."}</p>}
    {auto?<details><summary>Use a documented manual rate instead</summary><p>Use this only for a contracted planning rate. Currency reference displays continue to use the published source; the course calculation uses manual rates.</p><button type="button" onClick={()=>onChange({fxMode:"manual",usdFx:quote?exchangeRate(quote,"USD",currency):selection.usdFx,cadFx:quote?exchangeRate(quote,"CAD",currency):selection.cadFx})}>Switch to manual planning rates</button></details>:null}
  </section>;
}
