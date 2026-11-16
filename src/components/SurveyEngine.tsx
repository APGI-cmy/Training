"use client";

import { useEffect, useState } from "react";
import type { SurveyPrompt } from "@/types/course";

interface SurveyEngineProps {
  unitId: string;
  prompts: SurveyPrompt[];
}

export function SurveyEngine({ unitId, prompts }: SurveyEngineProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const storageKey = `apgi-training-survey-${unitId}`;

  useEffect(() => {
    const storedResponses = window.localStorage.getItem(storageKey);

    if (storedResponses) {
      setResponses(JSON.parse(storedResponses) as Record<string, string>);
    }
  }, [storageKey]);

  if (prompts.length === 0) {
    return null;
  }

  function saveResponses() {
    window.localStorage.setItem(storageKey, JSON.stringify(responses));
    setSaved(true);
  }

  return (
    <section className="content-band muted-band" aria-labelledby="activity-heading">
      <div className="content-inner">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Activity</p>
            <h2 id="activity-heading">Reflection and scenario practice</h2>
          </div>
          {saved && <span className="saved-indicator">Saved locally</span>}
        </div>

        <div className="activity-stack">
          {prompts.map((prompt) => (
            <article className="activity-card" key={prompt.id}>
              <h3>{prompt.prompt}</h3>
              {prompt.type === "reflection" ? (
                <textarea
                  value={responses[prompt.id] ?? ""}
                  onChange={(event) =>
                    setResponses((currentResponses) => ({
                      ...currentResponses,
                      [prompt.id]: event.target.value
                    }))
                  }
                  rows={4}
                />
              ) : (
                <div className="option-grid">
                  {prompt.options?.map((option) => (
                    <label className="option-tile" key={option.id}>
                      <input
                        type="radio"
                        name={prompt.id}
                        checked={responses[prompt.id] === option.id}
                        onChange={() =>
                          setResponses((currentResponses) => ({
                            ...currentResponses,
                            [prompt.id]: option.id
                          }))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="guidance">{prompt.guidance}</p>
            </article>
          ))}
        </div>

        <button className="primary-button" type="button" onClick={saveResponses}>
          Save activity
        </button>
      </div>
    </section>
  );
}
