export const screenshotTypes=['image/png','image/jpeg','image/webp'];
export function screenshotError(file:{type:string;size:number}){
 if(!screenshotTypes.includes(file.type))return 'Use a PNG, JPEG or WebP screenshot.';
 if(file.size>2*1024*1024)return 'Use a screenshot up to 2 MB. Crop or resize the image and paste it again.';
 if(!file.size)return 'The screenshot is empty. Copy an image and paste it again.';
 return '';
}
