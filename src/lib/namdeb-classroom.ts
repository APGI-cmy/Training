export const classroomPacks = {
  "namdeb-20261110": {
    "label": "Namdeb Group 1 — 10–11 November 2026",
    "dates": "10–11 November 2026",
    "attachments": [
      {
        "path": "/training-packs/namdeb-202611/learner-information-group-1.pdf",
        "filename": "learner-information-group-1.pdf",
        "sha256": "3639ae109dbc81181c35b00296f166993a40e3a5c0406240471fb36131481b84"
      },
      {
        "path": "/training-packs/namdeb-202611/block-programme.pdf",
        "filename": "block-programme.pdf",
        "sha256": "b13a3f582f2391cc1ed626388c0b64b8dc64ae135d91053ae1755543c52cc0e5"
      }
    ]
  },
  "namdeb-20261112": {
    "label": "Namdeb Group 2 — 12–13 November 2026",
    "dates": "12–13 November 2026",
    "attachments": [
      {
        "path": "/training-packs/namdeb-202611/learner-information-group-2.pdf",
        "filename": "learner-information-group-2.pdf",
        "sha256": "a423f6d7ee65f6a0555debd0a9029df928ed892ae9715de4bf38efa934d5fb01"
      },
      {
        "path": "/training-packs/namdeb-202611/block-programme.pdf",
        "filename": "block-programme.pdf",
        "sha256": "b13a3f582f2391cc1ed626388c0b64b8dc64ae135d91053ae1755543c52cc0e5"
      }
    ]
  }
} as const;
export type ClassroomPackId = keyof typeof classroomPacks;
export function getClassroomPack(id?: string) {
  return id && Object.hasOwn(classroomPacks,id) ? classroomPacks[id as ClassroomPackId] : null;
}
