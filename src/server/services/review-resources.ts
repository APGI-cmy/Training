import "server-only";
import resources from "@/data/course-review-resources.json";
import type {LearningUnit} from "@/types/course";
// Build-verified resources work when static assets are served separately from functions.
export function reviewEbook(unit:LearningUnit):string|null {
 const candidate=`${unit.assetBase}/data/book.pdf`;
 return resources.ebooks.some(path=>decodeURIComponent(path)===decodeURIComponent(candidate))?candidate:null;
}
