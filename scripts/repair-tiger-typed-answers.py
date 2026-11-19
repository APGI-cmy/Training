"""Reproduce the bounded answer-key repair from an unchanged delivered package."""
from pathlib import Path
import base64
import json
import sys

assets = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1]
for unit, expected in ((3, ['*assumptions', '*Assumptions']),
                       (5, ['*Confirm calmly', '*confirm calmly'])):
    relative = Path(f'public/courses/Tiger kidnapping_telecommunications/LU{unit}/res/data/quiz1.js')
    original = (assets / relative).read_text(encoding='utf8')
    marker = 'const quizInfo = "'
    encoded = original.split(marker, 1)[1].split('"', 1)[0]
    payload = base64.b64decode(encoded).decode('utf8')
    before = json.loads(payload)
    for answer in expected:
        old = json.dumps(answer)
        new = json.dumps(answer[1:])
        assert payload.count(old) == 1, (unit, answer)
        payload = payload.replace(old, new)
    after = json.loads(payload)
    # The exported data is preserved byte-for-byte except the four answer strings.
    repaired = original.replace(encoded, base64.b64encode(payload.encode('utf8')).decode(), 1)
    dest = target / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(repaired, encoding='utf8', newline='')
    assert before != after
    assert all(json.dumps(a) not in payload for a in expected)
    print(f'LU{unit}: repaired {len(expected)} typed answer variants')
