// This platform accepts provider routing/setup metadata, never raw card or bank
// credentials. Do not echo rejected field names or values into errors or logs.
const sensitive=new Set(['cardnumber','card','pan','cvv','cvc','securitycode','expiry','expiration','banknumber','bankaccount','bankaccountnumber','accountnumber','iban','routingnumber','sortcode','pin']);
export function assertNoPaymentDetails(form:FormData){
 for(const name of form.keys())if(sensitive.has(name.toLowerCase().replace(/[^a-z]/g,'')))throw Error('Enter card and bank details only in the payment provider’s hosted form. Do not submit them here.');
}
