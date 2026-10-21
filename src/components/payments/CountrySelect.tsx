import {paymentCountries} from "@/lib/payment-countries";

export function CountrySelect({label,defaultCountry=""}:{label:string;defaultCountry?:string}) {
 const code=defaultCountry.trim().toUpperCase();
 const selected=paymentCountries.some(country=>country.code===code)?code:"";
 return <label>{label}
  <select name="country" aria-label={label} defaultValue={selected} required>
   <option value="" disabled>Select your country</option>
   {paymentCountries.map(country=><option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
  </select>
  <span className="field-hint">Your country code is filled in automatically.</span>
 </label>;
}
