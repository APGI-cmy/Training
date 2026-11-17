import {CALCULATOR_VERSION} from '@/lib/course-calculator';
import {STRUCTURE_VERSION} from '@/lib/pricing-structures';
import {assertStagingIsolation} from '@/server/environment-isolation';
export function GET(){assertStagingIsolation();return Response.json({calculatorVersion:CALCULATOR_VERSION,pricingWorkflowVersion:STRUCTURE_VERSION,pricingOptions:4,livePaymentsEnabled:false,entitlementMode:'test',historicalPrices:'preserved'},{headers:{'cache-control':'no-store'}});}
