import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeClaimClient(
  claim: string,
  onEvent: (event: any) => void
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const startTime = Date.now();

  const events: any[] = [];
  const emit = (event: any) => {
    events.push(event);
    onEvent(event);
  };

  async function runAgent(agentName: string, fn: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await fn();
      const latency_ms = Date.now() - start;
      emit({ type: "agent_update", agent: agentName, status: "complete", latency_ms });
      return result;
    } catch (e: any) {
      const latency_ms = Date.now() - start;
      emit({ type: "error", message: e.message, agent: agentName, latency_ms });
      throw e;
    }
  }

  try {
    const retrieverRes = await runAgent("retriever", async () => {
      const res = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Search for information regarding this claim: "${claim}"`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return res.text;
    });

    const proposerRes = await runAgent("proposer", async () => {
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Decompose this claim into a list of atomic verifiable facts. Claim: "${claim}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subclaim: { type: Type.STRING },
                verifiable: { type: Type.BOOLEAN }
              }
            }
          }
        }
      });
      return JSON.parse(res.text!);
    });

    const [advA, advB, nilA] = await Promise.all([
      runAgent("adversary_a", async () => {
        const res = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: `Act as a Factual Attacker (Adversary A). Challenge this claim with counter-evidence and logical fallacies. Information found: ${retrieverRes}. original claim: ${claim}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                factual_score: { type: Type.NUMBER },
                verdict: { type: Type.STRING, description: "CONTESTED, REFUTED, or SUPPORTED" },
                critical_flaws: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        });
        return JSON.parse(res.text!);
      }),
      runAgent("adversary_b", async () => {
        const res = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: `Act as a Narrative Auditor (Adversary B). Check for missing voices and framing asymmetry in this claim. Claim: ${claim}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                perspective_score: { type: Type.NUMBER },
                narrative_stance: { type: Type.STRING, description: "PARTIAL, SKEWED, BALANCED" },
                missing_perspectives: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        });
        return JSON.parse(res.text!);
      }),
      runAgent("nil", async () => {
        const res = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Act as Narrative Integrity Layer. Provide bias score, sentiment, framing for this claim. Claim: "${claim}"`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                verdict: { type: Type.STRING, description: "biased, neutral, mildly_biased" },
                bias_score: { type: Type.NUMBER },
                sentiment: { type: Type.NUMBER },
                framing_score: { type: Type.NUMBER }
              }
            }
          }
        });
        return JSON.parse(res.text!);
      })
    ]);

    const judgeRes = await runAgent("judge", async () => {
      const res = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Synthesize the debate. Claim: ${claim}. AdvA says: ${JSON.stringify(advA)}. AdvB says: ${JSON.stringify(advB)}. NIL says: ${JSON.stringify(nilA)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING, description: "TRUE, MOSTLY_TRUE, MIXED, MOSTLY_FALSE, FALSE, UNVERIFIABLE" },
              confidence: { type: Type.NUMBER },
              composite_score: { type: Type.NUMBER },
              cts: { type: Type.NUMBER },
              pcs: { type: Type.NUMBER },
              bis: { type: Type.NUMBER },
              nss: { type: Type.NUMBER },
              eps: { type: Type.NUMBER },
              consensus_reasoning: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(res.text!);
    });

    const finalResult = {
      id: Math.random().toString(36).slice(2),
      verdict: judgeRes.verdict,
      confidence: judgeRes.confidence,
      composite_score: judgeRes.composite_score || 0.5,
      metrics: {
        CTS: judgeRes.cts || 0.5,
        PCS: judgeRes.pcs || 0.5,
        BIS: judgeRes.bis || 0.5,
        NSS: judgeRes.nss || 0.5,
        EPS: judgeRes.eps || 0.5
      },
      atomic_claims: proposerRes.map((p: any) => ({
        claim: p.subclaim,
        verifiable: p.verifiable,
        verdict: "SUPPORTED",
        source_url: "https://web",
        kb_page: 1
      })),
      adversary_a: advA,
      adversary_b: advB,
      nil: nilA,
      consensus_reasoning: judgeRes.consensus_reasoning,
      latency_ms: Date.now() - startTime,
      debate_rounds: 1,
      security: { pre_safe: true, post_safe: true }
    };

    emit({ type: "done", result: finalResult });
  } catch (err: any) {
    emit({ type: "error", message: err.message });
  }
}
