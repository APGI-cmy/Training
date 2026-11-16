"""Read native PPTX links and video files; never change the authored course.

Usage: python scripts/build-tiger-progression.py --course-root PATH --ffmpeg PATH
After authoring changes, recheck the generated map against the actual iSpring
export and prepare a new policy-version migration before activating it.
"""
import argparse,hashlib,json,posixpath,re,subprocess,zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--course-root',type=Path,required=True)
parser.add_argument('--ffmpeg',required=True)
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'src/data/tiger-progression.json')
args=parser.parse_args()
units={}
for number in range(1,9):
    deck=args.course_root/'powerpoint'/f'Tiger_Kidnapping_Telecommunications_Unit_{number:02}.pptx'
    activities=[]
    with zipfile.ZipFile(deck) as archive:
        slides=sorted((name for name in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',name)),key=lambda name:int(re.search(r'(\d+)\.xml',name)[1]))
        for slide in range(1,len(slides)+1):
            rel=f'ppt/slides/_rels/slide{slide}.xml.rels'
            if rel not in archive.namelist():continue
            for relationship in ET.fromstring(archive.read(rel)):
                if not relationship.get('Type','').endswith('/tags'):continue
                tags=posixpath.normpath('ppt/slides/'+relationship.get('Target'))
                for tag in ET.fromstring(archive.read(tags)).iter():
                    if tag.get('name')!='ISPRING_WO_WEB_ADDRESS_RELATIVE':continue
                    html=deck.parent/Path(tag.get('val').replace('\\','/'))
                    identifiers=set(re.findall(r'TK-LU\d{2}-(?:LA|F)\d{2}',html.read_text(encoding='utf-8-sig')))
                    if len(identifiers)!=1:raise ValueError(f'Ambiguous activity identifier: {html}')
                    activities.append({'id':identifiers.pop(),'slide':slide})
    video=args.course_root/'video'/f'unit_{number:02}_opening.mp4'
    probe=subprocess.run([args.ffmpeg,'-i',str(video)],capture_output=True,text=True)
    match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe.stderr)
    if not match:raise ValueError(f'Cannot read video duration: {video}')
    duration=int(match[1])*3600+int(match[2])*60+float(match[3])
    units[f'lu{number}']={'unitId':f'tiger-telecom-lu-{number}','slideCount':len(slides),'videoSlide':2,'duration':duration,'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'quizSlide':len(slides),'activities':activities}
fingerprint=hashlib.sha256(json.dumps(units,sort_keys=True).encode()).hexdigest()[:16]
policy={'courseId':'tiger-kidnapping-telecommunications','version':f'tiger-progression-1-{fingerprint}','videoThreshold':0.8,'quizThreshold':0.8,'units':units}
args.output.write_text(json.dumps(policy,indent=2)+'\n',encoding='utf-8')
print(f"Generated {policy['version']}: 8 units, {sum(len(p['activities']) for p in units.values())} linked activities")
