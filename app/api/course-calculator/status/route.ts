import {CALCULATOR_VERSION} from '@/lib/course-calculator';
import {assertStagingIsolation} from '@/server/environment-isolation';
export function GET(){assertStagingIsolation();return Response.json({calculatorVersion:CALCULATOR_VERSION,livePaymentsEnabled:false,entitlementMode:'test',historicalPrices:'preserved'},{headers:{'cache-control':'no-store'}});}
