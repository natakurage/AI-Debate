"use client";

import Bubble from "@/components/Bubble";
import { useState } from "react";
import { makeDecision, debate } from "./actions";
import { ChatBotMessage, Decision, Judgment } from "@/lib/ai";
import { FaArrowUp } from "react-icons/fa";

export default function Home() {
  const [agenda, setAgenda] = useState("");
  const [debateMessages, setDebateMessages] = useState<ChatBotMessage[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [decision, setDecision] = useState<Decision>();

  const numIterations = 3;
  const numJudges = 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebateMessages([]);
    setJudgments([]);
    console.log("Agenda:", agenda);
    console.log("Debate started");
    const history = await debate(agenda, numIterations);
    setDebateMessages(history);
    console.log("Judgement started");
    if (history.length === 0) return;
    const decision = await makeDecision(agenda, numJudges, debateMessages);
    setJudgments(decision.judgments);
    setDecision(decision);
  };

  return (
    <div className="max-w-4xl min-h-screen mx-auto p-3 pb-0 sm:p-20 sm:pb-0">
      <main className="flex flex-col gap-3">
        {
          debateMessages.length > 0 && <h1 className="text-3xl font-bold">{agenda}</h1>
        }
        {
          debateMessages.length > 0 && <>
            <div className="divider">Debate</div>
            {debateMessages.map(({ name, content}, index) => (
              <Bubble
                key={index}
                chatClass={name === "Affirmative" ? "chat-start" : "chat-end"}
                name={name}
                content={content}
                bgClass={name === "Affirmative" ? "border-primary" : "border-secondary"}
              />
            ))}
          </>
        }
        {
          judgments.length > 0 && <>
            <div className="divider">Judgement</div>
            {judgments.map(({ message: {name, content}, judgement }, index) => (
              <Bubble
                key={index}
                name={name}
                content={content}
                suffix={judgement}
              />
            ))}
          </>
        }
        {
          decision && <div className="mx-auto">
            <span>Affirmative: {decision.affirmatives}</span> <span>Negative: {decision.negatives}</span>
            <span></span>
            <p className="text-2xl font-bold">Result: {decision.result}</p>
          </div>
        }
      </main>
      <footer className="sticky bottom-0 w-full p-3 bg-base-200">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="text"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="grow"
                placeholder="Type Agenda"
              />
            </label>
            <button type="submit" className="btn">
              <FaArrowUp />
            </button>
          </form>
        </footer>
    </div>
  );
}
