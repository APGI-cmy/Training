import type {CreditCourse as RecordedCreditCourse} from './course-calculator';
export type CreditCourse=RecordedCreditCourse&{industry?:string;clientName?:string};
