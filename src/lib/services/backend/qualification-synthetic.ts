/**
 * Synthetic question fixture from kkl-backend
 * `data/qualification-questions.synthetic.v1.json` @ a606665.
 *
 * Labelled SYNTHETIC so it cannot be mistaken for the client questionnaire.
 * Posted only with provenance `synthetic_test`.
 */

export const SYNTHETIC_QUESTION_SET = {
  versionLabelPrefix: "synthetic",
  provenance: "synthetic_test" as const,
  activate: true,
  questions: [
    {
      key: "synthetic_interest",
      prompt: "SYNTHETIC — not a client question. Name a test interest.",
      required: true,
      collects: "fact" as const,
      answerSchema: { type: "string", minLength: 1, maxLength: 80 },
    },
    {
      key: "synthetic_budget",
      prompt: "SYNTHETIC — not a client question. Give a test whole number.",
      required: true,
      collects: "fact" as const,
      answerSchema: { type: "integer", minimum: 0, maximum: 100 },
    },
    {
      key: "synthetic_consent_wording",
      prompt: "SYNTHETIC — not a client question. Reply true only as a fixture.",
      required: false,
      collects: "consent_evidence" as const,
      answerSchema: { type: "boolean" },
    },
    {
      key: "synthetic_stop",
      prompt: "SYNTHETIC — not a client question. Reply true to stop this fixture.",
      required: false,
      collects: "opt_out_signal" as const,
      answerSchema: { type: "boolean" },
    },
  ],
} as const;
