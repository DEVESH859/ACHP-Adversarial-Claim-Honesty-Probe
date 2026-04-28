import React, { useState, useEffect, useRef } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { analyzeClaimClient } from "./lib/pipeline";
import { Search, Server, FileText, ChevronRight, ShieldCheck, PieChart, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const agentsList = [
  { id: "retriever", name: "Retriever", desc: "BM25+FAISS RAG" },
  { id: "proposer", name: "Proposer", desc: "Atomic Decomposition" },
  { id: "adversary_a", name: "Adversary A", desc: "Factual Attacker" },
  { id: "adversary_b", name: "Adversary B", desc: "Narrative Auditor" },
  { id: "nil", name: "NIL Layer", desc: "Bias & Sentiment" },
  { id: "judge", name: "Judge", desc: "Consensus Synthesis" }
];

export default function App() {
  const [claim, setClaim] = useState("");
  const [status, setStatus] = useState<"idle"|"running"|"completed"|"error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const startAnalysis = async () => {
    if (!claim) return;
    setStatus("running");
    setErrorMessage("");
    setEvents([]);
    setResult(null);

    analyzeClaimClient(claim, (data) => {
      if (data.type === "agent_update") {
        setEvents(prev => [...prev, data]);
      } else if (data.type === "done") {
        setResult(data.result);
        setStatus("completed");
      } else if (data.type === "error") {
        setStatus("error");
        setErrorMessage(data.message || "An unknown error occurred during analysis.");
      }
    });
  };

  const radarData = result ? [
    { subject: 'CTS', A: result.metrics.CTS * 100, fullMark: 100 },
    { subject: 'PCS', A: result.metrics.PCS * 100, fullMark: 100 },
    { subject: '1-BIS', A: (1 - result.metrics.BIS) * 100, fullMark: 100 },
    { subject: 'NSS', A: result.metrics.NSS * 100, fullMark: 100 },
    { subject: 'EPS', A: result.metrics.EPS * 100, fullMark: 100 },
  ] : [];

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "TRUE": return <Badge className="bg-green-600">✅ TRUE</Badge>;
      case "MOSTLY_TRUE": return <Badge className="bg-green-500">🟢 MOSTLY_TRUE</Badge>;
      case "MIXED": return <Badge className="bg-yellow-500">🟡 MIXED</Badge>;
      case "MOSTLY_FALSE": return <Badge className="bg-orange-500">🟠 MOSTLY_FALSE</Badge>;
      case "FALSE": return <Badge className="bg-red-600">🔴 FALSE</Badge>;
      default: return <Badge variant="outline">⬜ UNVERIFIABLE</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              ACHP
            </h1>
            <p className="text-neutral-400 mt-1">Adversarial Claim & Honesty Probe</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 opacity-70 text-sm font-mono">
            <span>v2.0.0</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>API Online</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                    <CardTitle className="text-white">Claim Input</CardTitle>
                <CardDescription className="text-neutral-300">Enter a factual or narrative claim to run through the 7-agent pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. Regular exercise reduces cardiovascular disease risk by 30-40 percent." 
                    className="bg-neutral-950 border-neutral-800 text-neutral-100"
                    value={claim}
                    onChange={e => setClaim(e.target.value)}
                    disabled={status === "running"}
                  />
                  <Button 
                    onClick={startAnalysis}
                    disabled={!claim || status === "running"}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                  >
                    {status === "running" ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    {status === "running" ? "Running..." : "Analyze"}
                  </Button>
                </div>
                {status !== "idle" && (
                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <div className="flex justify-between text-sm text-neutral-400">
                      <span>Pipeline Progress</span>
                      <span>{events.length} / 6 agents completed</span>
                    </div>
                    <Progress value={(events.length / 6) * 100} className="h-2" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {agentsList.map(agent => {
                        const evt = events.find(e => e.agent === agent.id);
                        const isDone = !!evt;
                        const isRunning = !isDone && status === "running" && 
                          (events.length > 0 && events[events.length-1].agent !== agent.id);
                        
                        return (
                          <div key={agent.id} className={`flex items-center gap-2 text-sm p-2 rounded ${isDone ? 'bg-green-950/30 border border-green-900/50 text-neutral-300' : 'text-neutral-500'}`}>
                            {isDone ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <Server className="w-4 h-4" />}
                            <span>{agent.name}</span>
                            {evt?.latency_ms && <span className="ml-auto text-xs opacity-50">{evt.latency_ms}ms</span>}
                          </div>
                        )
                      })}
                    </div>

                    {status === "error" && errorMessage && (
                      <div className="mt-4 p-3 bg-red-950/50 border border-red-900 rounded text-red-400 text-sm flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Tabs defaultValue="overview">
                <TabsList className="bg-neutral-900 border-b border-neutral-800 w-full justify-start rounded-none h-12">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800 text-neutral-400 data-[state=active]:text-white">Overview</TabsTrigger>
                  <TabsTrigger value="atomic" className="data-[state=active]:bg-neutral-800 text-neutral-400 data-[state=active]:text-white">Atomic Claims</TabsTrigger>
                  <TabsTrigger value="agents" className="data-[state=active]:bg-neutral-800 text-neutral-400 data-[state=active]:text-white">Agent Payloads</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6 space-y-6">
                  <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-white">Judge Synthesis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center gap-4 text-xl">
                          Verdict: {getVerdictBadge(result.verdict)}
                          <span className="text-sm font-mono text-neutral-400 ml-auto">Confidence: {(result.confidence * 100).toFixed(1)}%</span>
                       </div>
                       <p className="text-neutral-300 leading-relaxed font-serif text-lg border-l-2 border-neutral-700 pl-4">
                         {result.consensus_reasoning}
                       </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="atomic" className="mt-6">
                  <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                      <CardTitle className="text-white">Atomic Decomposition</CardTitle>
                      <CardDescription className="text-neutral-300">The Proposer agent breaks down the claim into verifiable facts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                            <TableHead className="text-neutral-100">Sub-claim</TableHead>
                            <TableHead className="text-neutral-100">Type</TableHead>
                            <TableHead className="text-neutral-100">Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.atomic_claims.map((ac: any, idx: number) => (
                            <TableRow key={idx} className="border-neutral-800 hover:bg-neutral-800/50">
                              <TableCell className="font-medium text-neutral-200">{ac.claim}</TableCell>
                              <TableCell>
                                {ac.verifiable ? <Badge variant="outline" className="text-blue-400 border-blue-400">Verifiable</Badge> : <Badge variant="outline">Opinion</Badge>}
                              </TableCell>
                              <TableCell className="text-neutral-400 text-sm">Web Context</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="agents" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-neutral-900 border-red-900/50">
                      <CardHeader>
                        <CardTitle className="text-red-400 text-lg flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Adversary A (Factual)</CardTitle>
                      </CardHeader>
                      <CardContent>
                         <p className="text-sm text-neutral-400 mb-2">Verdict: <strong className="text-white uppercase">{result.adversary_a.verdict}</strong></p>
                         <ul className="list-disc pl-4 text-sm text-neutral-300 space-y-1">
                           {result.adversary_a.critical_flaws?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                         </ul>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-900 border-orange-900/50">
                      <CardHeader>
                        <CardTitle className="text-orange-400 text-lg flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Adversary B (Narrative)</CardTitle>
                      </CardHeader>
                      <CardContent>
                         <p className="text-sm text-neutral-400 mb-2">Stance: <strong className="text-white uppercase">{result.adversary_b.narrative_stance}</strong></p>
                         <p className="text-sm text-neutral-400">Missing Perspectives:</p>
                         <ul className="list-disc pl-4 text-sm text-neutral-300 space-y-1">
                           {result.adversary_b.missing_perspectives?.map((m: string, i: number) => <li key={i}>{m}</li>)}
                         </ul>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-900 border-blue-900/50 md:col-span-2">
                       <CardContent className="p-4 flex gap-4 text-sm font-mono items-center">
                          <span className="text-blue-400">NIL Layer:</span>
                          <span>Verdict={result.nil.verdict}</span>
                          <span>Bias={result.nil.bias_score?.toFixed(2)}</span>
                          <span>Sentiment={result.nil.sentiment?.toFixed(2)}</span>
                       </CardContent>
                    </Card>
                  </div>
                </TabsContent>

              </Tabs>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">ACHP Metrics</CardTitle>
                <CardDescription className="text-neutral-300">Multi-dimensional integrity vector</CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#333" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Claim" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {Object.entries(result.metrics).map(([key, value]) => (
                        <div key={key} className="bg-neutral-950 border border-neutral-800 p-3 rounded text-center">
                          <div className="text-xs text-neutral-500">{key}</div>
                          <div className="text-lg font-mono text-neutral-200">{Number(value).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-neutral-950 border border-neutral-800 p-3 rounded text-center">
                       <div className="text-xs text-neutral-500 uppercase tracking-wider">Composite Score</div>
                       <div className="text-2xl font-bold font-mono text-blue-500">{result.composite_score.toFixed(3)}</div>
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-neutral-600 flex-col gap-2">
                    <PieChart className="w-8 h-8 opacity-20" />
                    <span className="text-sm">Awaiting analysis payload</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
               <CardHeader className="py-4">
                  <CardTitle className="text-sm text-white">Knowledge Base Upload</CardTitle>
               </CardHeader>
               <CardContent>
                 <label className="border-2 border-dashed border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-neutral-800/50 transition-colors cursor-pointer text-neutral-400 group cursor-pointer">
                    <FileText className="w-8 h-8 mb-2 text-neutral-600 group-hover:text-blue-500" />
                    <p className="text-sm text-neutral-300">Drag & drop PDF or Text</p>
                    <p className="text-xs text-neutral-500 mt-1">Ground claims in documentation</p>
                    <input type="file" className="hidden" accept=".pdf,.txt,.docx" onChange={(e) => {
                      if (e.target.files?.length) {
                        alert(`Uploaded ${e.target.files[0].name} (Mocked)`);
                        e.target.value = '';
                      }
                    }} />
                 </label>
                 <div className="mt-4 flex flex-col gap-2">
                    <div className="bg-neutral-950 p-2 text-xs border border-neutral-800 flex justify-between items-center rounded">
                       <span className="flex items-center gap-2 text-neutral-200"><div className="w-2 h-2 rounded-full bg-green-500"></div> Web Fallback Enabled</span>
                    </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
