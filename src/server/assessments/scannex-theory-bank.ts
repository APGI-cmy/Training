import "server-only";

import type { ScannexTheoryAnswerState, ScannexTheoryQuestion } from "@/types/scannex-assessment";

export const SCANNEX_THEORY_MAX_SCORE = 68;
export const SCANNEX_PRACTICAL_MAX_SCORE = 32;
export const SCANNEX_SUMMATIVE_PASS_MARK = 75;
export const SCANNEX_THEORY_VERSION = "scannex-summative-v2-classroom-202611";

type MarkedQuestion = ScannexTheoryQuestion & { correctOptionIds: string[] };

const questions: MarkedQuestion[] = [
  {
    "id": "practice-01",
    "section": "LU1 — Why Scannex Is Needed — Knowledge Check",
    "prompt": "Why can a correctly working metal detector provide no warning about a diamond?",
    "instruction": "Choose one answer.",
    "marks": 4,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "A diamond is non-metallic carbon."
      },
      {
        "id": "b",
        "label": "All diamonds have no financial value."
      },
      {
        "id": "c",
        "label": "A metal detector produces a full-body X-ray image."
      },
      {
        "id": "d",
        "label": "Every diamond is too large to conceal."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "practice-02",
    "section": "LU1 — The Scannex Operator Role — Knowledge Check",
    "prompt": "A busy period creates pressure to skip an approved step. Which capability is most directly relevant?",
    "instruction": "Choose one answer.",
    "marks": 4,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Procedural discipline."
      },
      {
        "id": "b",
        "label": "The physical size of a diamond."
      },
      {
        "id": "c",
        "label": "Historical discovery."
      },
      {
        "id": "d",
        "label": "Recovery effort."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "practice-03",
    "section": "LU1 — Diamond Value and Loss — Knowledge Check",
    "prompt": "What investment contributes to recovering diamonds? Select all that apply.",
    "instruction": "Select every correct response.",
    "marks": 3,
    "responseType": "multiple",
    "options": [
      {
        "id": "a",
        "label": "People."
      },
      {
        "id": "b",
        "label": "Equipment."
      },
      {
        "id": "c",
        "label": "Energy."
      },
      {
        "id": "d",
        "label": "Processing."
      },
      {
        "id": "e",
        "label": "No sustained work is required."
      }
    ],
    "correctOptionIds": [
      "a",
      "b",
      "c",
      "d"
    ]
  },
  {
    "id": "practice-04",
    "section": "LU2 — How Materials Appear in an X-ray Image — Knowledge Check",
    "prompt": "Why do air-filled areas appear dark in the normal greyscale image?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "More X-rays reach the detector through air."
      },
      {
        "id": "b",
        "label": "No X-rays can pass through air."
      },
      {
        "id": "c",
        "label": "Air always appears brighter than bone."
      },
      {
        "id": "d",
        "label": "A dark area automatically proves concealment."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "practice-05",
    "section": "LU2 — Five Layers of Scannex Safety — Knowledge Check",
    "prompt": "Which combination supports dose accountability?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Measure, control and record exposure."
      },
      {
        "id": "b",
        "label": "Guess exposure from the image’s appearance."
      },
      {
        "id": "c",
        "label": "Use queue length as the only control."
      },
      {
        "id": "d",
        "label": "Keep no exposure records."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "practice-06",
    "section": "LU3 — Safe Operating Discipline — Knowledge Check",
    "prompt": "Select one or more correct answers:\n\nWhich habits should an operator apply on every shift? Select all that apply.",
    "instruction": "Select every correct response.",
    "marks": 3,
    "responseType": "multiple",
    "options": [
      {
        "id": "a",
        "label": "Confirm authorisation and current QA status."
      },
      {
        "id": "b",
        "label": "Use approved settings and apply ALARA."
      },
      {
        "id": "c",
        "label": "Check exclusions discreetly."
      },
      {
        "id": "d",
        "label": "Stop use and report faults."
      },
      {
        "id": "e",
        "label": "Keep exposure and safety records accurate."
      },
      {
        "id": "f",
        "label": "Explain the process calmly and factually."
      },
      {
        "id": "g",
        "label": "Override controls when operational pressure is high."
      }
    ],
    "correctOptionIds": [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f"
    ]
  },
  {
    "id": "practice-07",
    "section": "LU3 — Quality Assurance and Records — Knowledge Check",
    "prompt": "Select the correct answer option:\n\nWhich statement correctly describes routine Scannex quality assurance?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "QA is needed only after a fault."
      },
      {
        "id": "b",
        "label": "The system is checked before first use and at least every three months, including image-quality checks using a suitable test phantom."
      },
      {
        "id": "c",
        "label": "QA is optional when the operator is experienced."
      },
      {
        "id": "d",
        "label": "QA is done only when an external auditor arrives."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-08",
    "section": "LU4 — The Legal and Human-Rights Framework — Knowledge Check",
    "prompt": "What must be confirmed before a Scannex scan starts?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "The operator has time available."
      },
      {
        "id": "b",
        "label": "The applicable local law and approved procedure provide a lawful basis."
      },
      {
        "id": "c",
        "label": "The person looks unusual."
      },
      {
        "id": "d",
        "label": "A colleague is interested in the result."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-09",
    "section": "LU4 — A Positive Indication: Lawful Response — Knowledge Check",
    "prompt": "What should an operator do when a possible indication appears?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Accuse the person immediately."
      },
      {
        "id": "b",
        "label": "Remain calm, preserve the relevant record and follow the approved process."
      },
      {
        "id": "c",
        "label": "Share the image with all staff."
      },
      {
        "id": "d",
        "label": "Destroy the image after viewing it."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-10",
    "section": "LU5 — System Operation and Safety Glossary — Knowledge Check",
    "prompt": "Which action is correct when a scanner has not been commissioned or formally released after maintenance?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Use it only for low-risk scans."
      },
      {
        "id": "b",
        "label": "Keep it out of service until an authorised specialist has approved it."
      },
      {
        "id": "c",
        "label": "Ask the Viewer to operate it."
      },
      {
        "id": "d",
        "label": "Change the dose setting and run a test scan."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-11",
    "section": "LU5 — Engineered Safety — Knowledge Check",
    "prompt": "Which actions are correct when a fault indication appears? Select all that apply.",
    "instruction": "Select every correct response.",
    "marks": 3,
    "responseType": "multiple",
    "options": [
      {
        "id": "a",
        "label": "Stop the process and report the fault."
      },
      {
        "id": "b",
        "label": "Keep the X-rays off until the authorised process clears the fault."
      },
      {
        "id": "c",
        "label": "Work around the fault if the person is waiting."
      },
      {
        "id": "d",
        "label": "Ask the operator to increase the dose."
      }
    ],
    "correctOptionIds": [
      "a",
      "b"
    ]
  },
  {
    "id": "practice-12",
    "section": "LU5 — Roles and Cubicle Safeguards — Knowledge Check",
    "prompt": "Which cubicle controls support a safe and consistent scan? Select all that apply.",
    "instruction": "Select every correct response.",
    "marks": 3,
    "responseType": "multiple",
    "options": [
      {
        "id": "a",
        "label": "A clutter-free standing area."
      },
      {
        "id": "b",
        "label": "No accessible moving parts."
      },
      {
        "id": "c",
        "label": "A fixed scan duration."
      },
      {
        "id": "d",
        "label": "Personal belongings placed around the scanner."
      }
    ],
    "correctOptionIds": [
      "a",
      "b",
      "c"
    ]
  },
  {
    "id": "practice-13",
    "section": "LU6 — Viewing System Glossary — Knowledge Check",
    "prompt": "What is the purpose of a reference image?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "To replace the current scan image."
      },
      {
        "id": "b",
        "label": "To help distinguish an item already present from a newly introduced object."
      },
      {
        "id": "c",
        "label": "To change the scan dose."
      },
      {
        "id": "d",
        "label": "To identify the Viewer by name."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-14",
    "section": "LU6 — Viewing Controls and Image Enhancement — Knowledge Check",
    "prompt": "When an area looks doubtful in normal view, what is the best next action?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Release the scan immediately."
      },
      {
        "id": "b",
        "label": "Inspect the area in more than one approved viewing mode and zoom level."
      },
      {
        "id": "c",
        "label": "Change the station configuration."
      },
      {
        "id": "d",
        "label": "Ask the Scan Operator to interpret the image."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-15",
    "section": "LU7 — Image Interpretation Glossary — Knowledge Check",
    "prompt": "What is the purpose of Automatic Diamond Detection, or ADD?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "To replace the Viewer’s judgement."
      },
      {
        "id": "b",
        "label": "To flag possible objects for the Viewer’s attention."
      },
      {
        "id": "c",
        "label": "To physically search a person."
      },
      {
        "id": "d",
        "label": "To change the X-ray dose."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-16",
    "section": "LU7 — A Disciplined Image Review — Knowledge Check",
    "prompt": "What should the operator do before forming a judgement about a region of interest?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Immediately escalate the image."
      },
      {
        "id": "b",
        "label": "Optimise brightness and contrast for the area being examined."
      },
      {
        "id": "c",
        "label": "Conduct a physical search."
      },
      {
        "id": "d",
        "label": "Ignore the region if it is faint."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-17",
    "section": "LU8 — Why Anatomy Matters — Knowledge Check",
    "prompt": "Why does a Scannex operator study anatomy?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "To diagnose disease."
      },
      {
        "id": "b",
        "label": "To account for normal structures so unexplained anomalies can be assessed."
      },
      {
        "id": "c",
        "label": "To decide whether a physical search is lawful."
      },
      {
        "id": "d",
        "label": "To repair image-viewing equipment."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "practice-18",
    "section": "LU8 — Normal Anatomy That Can Mislead the Eye — Knowledge Check",
    "prompt": "Which feature most strongly indicates normal vertebral anatomy rather than an isolated concealed object?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "A single uniform density unrelated to surrounding structures."
      },
      {
        "id": "b",
        "label": "A repeating, aligned pattern of pedicles and spinous processes down the spine."
      },
      {
        "id": "c",
        "label": "A density that has changed position along the digestive route."
      },
      {
        "id": "d",
        "label": "A feature outside the expected body anatomy."
      }
    ],
    "correctOptionIds": [
      "b"
    ]
  },
  {
    "id": "variation-01",
    "section": "LU1 — The Scannex Operator Role — Knowledge Check",
    "prompt": "A queue is growing and a colleague asks you to skip an approved screening step. What is the appropriate response?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Keep the approved procedure and use the authorised escalation process for the delay."
      },
      {
        "id": "b",
        "label": "Skip the step for familiar employees."
      },
      {
        "id": "c",
        "label": "Ask the next person in the queue to decide."
      },
      {
        "id": "d",
        "label": "Stop keeping records until the queue clears."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "variation-02",
    "section": "LU6 — Viewing Controls and Image Enhancement — Knowledge Check",
    "prompt": "A region remains doubtful after your first look at the normal image. What should you do next?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "Review it using approved viewing modes and suitable zoom levels."
      },
      {
        "id": "b",
        "label": "Change the station configuration to remove the region."
      },
      {
        "id": "c",
        "label": "Release it because the first view was inconclusive."
      },
      {
        "id": "d",
        "label": "Ask the person being screened to interpret it."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "variation-03",
    "section": "LU7 — Image Interpretation Glossary — Knowledge Check",
    "prompt": "ADD has highlighted a possible object. What does that mean for your work as the Viewer?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "It is a prompt for careful review; the Viewer still applies trained judgement and the approved process."
      },
      {
        "id": "b",
        "label": "ADD has proved theft."
      },
      {
        "id": "c",
        "label": "No further examination is required."
      },
      {
        "id": "d",
        "label": "The scan dose must be increased."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  },
  {
    "id": "variation-04",
    "section": "LU8 — Why Anatomy Matters — Knowledge Check",
    "prompt": "An image contains a structure in the expected anatomical position. Why does your anatomy training matter?",
    "instruction": "Choose one answer.",
    "marks": 3,
    "responseType": "single",
    "options": [
      {
        "id": "a",
        "label": "It helps distinguish normal structures from unexplained anomalies without diagnosing disease."
      },
      {
        "id": "b",
        "label": "It authorises the Viewer to make a medical diagnosis."
      },
      {
        "id": "c",
        "label": "It removes the need for the approved screening process."
      },
      {
        "id": "d",
        "label": "It allows the Viewer to repair the scanner."
      }
    ],
    "correctOptionIds": [
      "a"
    ]
  }
];

export function getScannexTheoryQuestions(): ScannexTheoryQuestion[] {
  return questions.map(({ correctOptionIds: _correctOptionIds, ...question }) => question);
}

export function scoreScannexTheoryAssessment(answers: ScannexTheoryAnswerState) {
  let score = 0;

  for (const question of questions) {
    const validOptions = new Set(question.options.map((option) => option.id));
    const selected = [...new Set((answers[question.id] ?? []).filter((optionId) => validOptions.has(optionId)))].sort();
    const expected = [...question.correctOptionIds].sort();
    const isCorrect = selected.length === expected.length && selected.every((optionId, index) => optionId === expected[index]);
    if (isCorrect) score += question.marks;
  }

  return {
    score,
    maxScore: SCANNEX_THEORY_MAX_SCORE,
    passed: score + SCANNEX_PRACTICAL_MAX_SCORE >= SCANNEX_SUMMATIVE_PASS_MARK
  };
}

export function hasAnswerForEveryScannexTheoryQuestion(answers: ScannexTheoryAnswerState) {
  return questions.every((question) => Array.isArray(answers[question.id]) && answers[question.id].length > 0);
}
