import React, { useMemo, useState } from "react";

// --- Model inputs (from Vroom Time-Driven funnel) ---
const FACTORS = {
  DS: {
    label: "Decision Significance",
    help:
      "How significant is this decision to project/org success? (High = big consequences; Low = limited impact)",
  },
  IC: {
    label: "Importance of Commitment",
    help:
      "How important is team commitment for implementation? (High = buy-in is critical; Low = you can implement without much buy-in)",
  },
  LE: {
    label: "Leader Expertise",
    help:
      "How much relevant expertise do you (the leader) have? (High = you have strong knowledge; Low = you don't)",
  },
  LC: {
    label: "Likelihood of Commitment",
    help:
      "If you decide alone, how likely is the team to commit anyway? (High = they'll commit; Low = they may resist)",
  },
  GA: {
    label: "Goal Alignment",
    help:
      "Do team goals align with organizational goals on this decision? (High = aligned; Low = misaligned)",
  },
  GE: {
    label: "Group Expertise",
    help:
      "Does the group have relevant expertise/knowledge? (High = yes; Low = not really)",
  },
  TC: {
    label: "Team Competence",
    help:
      "Can the team work together effectively to solve problems? (High = works well; Low = struggles to collaborate)",
  },
};

const STYLES = {
  DECIDE: {
    title: "Decide",
    subtitle: "You decide alone",
    details: "Make the decision yourself. Communicate clearly, then drive execution.",
  },
  CI: {
    title: "Consult (Individually)",
    subtitle: "You decide after 1:1 input",
    details: "Talk to key people one-on-one, then make the call.",
  },
  CG: {
    title: "Consult (Group)",
    subtitle: "You decide after group input",
    details: "Bring the group together for input, then you decide.",
  },
  FAC: {
    title: "Facilitate",
    subtitle: "Run a group process to shape the decision",
    details:
      "Facilitate a discussion to build shared understanding and converge on the best option.",
  },
  DEL: {
    title: "Delegate",
    subtitle: "Let the team decide",
    details: "Define boundaries/constraints, then empower the team to decide.",
  },
};

/**
 * Encodes the Time-Driven funnel as a decision tree.
 */
const TREE = {
  q: "DS",
  next: {
    H: {
      q: "IC",
      next: {
        H: {
          q: "LE",
          next: {
            H: {
              q: "LC",
              next: {
                H: { result: "DECIDE" },
                L: {
                  q: "GA",
                  next: {
                    L: { result: "CG" },
                    H: {
                      q: "GE",
                      next: {
                        L: { result: "CG" },
                        H: {
                          q: "TC",
                          next: {
                            H: { result: "FAC" },
                            L: { result: "CG" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            L: {
              q: "LC",
              next: {
                H: {
                  q: "GA",
                  next: {
                    L: { result: "CI" },
                    H: {
                      q: "GE",
                      next: {
                        L: { result: "CI" },
                        H: {
                          q: "TC",
                          next: {
                            H: { result: "FAC" },
                            L: { result: "CI" },
                          },
                        },
                      },
                    },
                  },
                },
                L: {
                  q: "GA",
                  next: {
                    L: { result: "CG" },
                    H: {
                      q: "GE",
                      next: {
                        L: { result: "CG" },
                        H: {
                          q: "TC",
                          next: {
                            H: { result: "FAC" },
                            L: { result: "CG" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        L: {
          q: "LE",
          next: {
            H: { result: "DECIDE" },
            L: {
              q: "GA",
              next: {
                L: { result: "CI" },
                H: {
                  q: "GE",
                  next: {
                    L: { result: "CI" },
                    H: {
                      q: "TC",
                      next: {
                        H: { result: "FAC" },
                        L: { result: "CI" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    L: {
      q: "IC",
      next: {
        H: {
          q: "LC",
          next: {
            H: { result: "DECIDE" },
            L: {
              q: "TC",
              next: {
                H: { result: "DEL" },
                L: { result: "FAC" },
              },
            },
          },
        },
        L: { result: "DECIDE" },
      },
    },
  },
};

function resolve(tree, answers) {
  const path = [];
  let node = tree;

  while (node && !node.result) {
    const q = node.q;
    const a = answers[q];
    if (!a) return { status: "incomplete", nextQuestion: q, path };
    path.push({ factor: q, value: a });
    node = node.next?.[a];
    if (!node) return { status: "error", message: "Invalid path in model." };
  }
  return { status: "complete", result: node.result, path };
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">{title}</div>
          {subtitle ? <div className="cardSub">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="cardBody">{children}</div>
    </div>
  );
}

export default function App() {
  const [problem, setProblem] = useState("");
  const [answers, setAnswers] = useState({});
  const [copied, setCopied] = useState(false);

  const resolution = useMemo(() => resolve(TREE, answers), [answers]);
  const resultStyle =
    resolution.status === "complete" ? STYLES[resolution.result] : null;

  const currentFactor =
    resolution.status === "incomplete" ? resolution.nextQuestion : null;

  const factorList = useMemo(() => {
    const asked = new Set(Object.keys(answers));
    if (currentFactor) asked.add(currentFactor);
    return ["DS", "IC", "LE", "LC", "GA", "GE", "TC"].filter((k) => asked.has(k));
  }, [answers, currentFactor]);

  const setFactor = (k, v) => {
    const next = { ...answers };
    if (!v) delete next[k];
    else next[k] = v;

    const kept = {};
    let node = TREE;
    while (node && !node.result) {
      const q = node.q;
      if (!next[q]) break;
      kept[q] = next[q];
      node = node.next[next[q]];
    }
    setAnswers(kept);
  };

  const reset = () => {
    setProblem("");
    setAnswers({});
  };

  const copySummary = async () => {
    if (resolution.status !== "complete") return;

    const human = (v) => (v === "H" ? "High" : "Low");
    const path = resolution.path
      .map((p) => `${p.factor}=${human(p.value)}`)
      .join(", ");

    const nextStep =
      resultStyle?.title === "Decide"
        ? "Draft the decision + 2–3 crisp reasons, then communicate the call and the execution plan."
        : resultStyle?.title === "Consult (Individually)"
        ? "Do 10–20 minute 1:1s with key stakeholders, synthesize input, then make the call."
        : resultStyle?.title === "Consult (Group)"
        ? "Run a short meeting for input, summarize tradeoffs, then decide and communicate."
        : resultStyle?.title === "Facilitate"
        ? "Facilitate a focused working session: define options, surface constraints, converge, and align on execution."
        : resultStyle?.title === "Delegate"
        ? "Define constraints (scope, timeline, budget, success criteria) and let the team decide—then support execution."
        : "";

    const text = [
      "Time-Driven Normative Model — Decision Summary",
      problem ? `Decision: ${problem}` : "Decision: (not provided)",
      `Recommended process: ${resultStyle?.title || "(not available)"}`,
      `Path taken: ${path || "(not available)"}`,
      nextStep ? `Suggested next step: ${nextStep}` : "Suggested next step: (see app)",
      "",
      "Attribution: Educational implementation of Vroom’s Normative Model (Time-Driven, 2022). Not affiliated.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1>🧭 How to Decide – A Time-Driven Leadership Tool</h1>
          <p className="small" style={{ fontStyle: "italic" }}>
            Based on Vroom’s Normative Model of Leadership Decision-Making
          </p>
        </div>
        <button className="btn" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="grid">
        <Card title="What decision are you facing?" subtitle="One sentence is enough.">
          <textarea
            className="textarea"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="I need to make a decision that affects multiple leaders, where expectations of fairness and buy-in matter, but time is limited."
          />
        </Card>

        {factorList.map((k) => (
          <Card
            key={k}
            title={FACTORS[k].label}
            subtitle={FACTORS[k].help}
            right={k === currentFactor ? <span className="pill">Next</span> : null}
          >
            <div className="segment">
              <button
                className={`segBtn ${answers[k] === "H" ? "segBtnActive" : ""}`}
                onClick={() => setFactor(k, answers[k] === "H" ? null : "H")}
              >
                High
              </button>
              <button
                className={`segBtn ${answers[k] === "L" ? "segBtnActive" : ""}`}
                onClick={() => setFactor(k, answers[k] === "L" ? null : "L")}
              >
                Low
              </button>
            </div>
          </Card>
        ))}

        {resolution.status === "complete" && resultStyle && (
          <div className="card fadeIn">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">
                  Recommended process: {resultStyle.title}
                </div>
                <div className="cardSub">{resultStyle.subtitle}</div>
              </div>
              <button className="btn" onClick={copySummary} title="Copy shareable summary">
                {copied ? "Copied ✅" : "Copy summary"}
              </button>
            </div>
            <div className="cardBody">
              <p style={{ marginTop: 0 }}>{resultStyle.details}</p>
            </div>
          </div>
        )}
      </div>

      <div className="small" style={{ marginTop: 32 }}>
        Built from the Time-Driven Model funnel in Victor H. Vroom’s “On the Normative Model” (2022).
      </div>
    </div>
  );
}
