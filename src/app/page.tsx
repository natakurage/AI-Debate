"use client";

import Bubble from "@/components/Bubble";
import { useEffect, useState } from "react";
import { debateProgressive, judge, aggregateJudgments } from "./actions";
import { ChatBotMessage, Decision, History, Judgment } from "@/lib/ai";
import { FaArrowUp } from "react-icons/fa";

export default function Home() {
  const [agenda, setAgenda] = useState("");
  const [debateMessages, setDebateMessages] = useState<ChatBotMessage[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [decision, setDecision] = useState<Decision>();

  const numIterations = 3;
  const numJudges = 3;

  const scrollToEnd = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebateMessages([]);
    setJudgments([]);
    console.log("Agenda:", agenda);
    console.log("Debate started");
    let history: History = [];
    for (let i = 0; i < numIterations; i++) {
      history = await debateProgressive(agenda, history);
      setDebateMessages(history);
    }
    console.log("Judgement started");
    for (let i = 0; i < numJudges; i++) {
      const newJudgment = await judge(agenda, i, history);
      setJudgments(judgments => [...judgments, newJudgment]);
    }
    const decision = await aggregateJudgments(judgments);
    setDecision(decision);
  };

  useEffect(() => {
    if (debateMessages.length === 0 && judgments.length === 0) return;
    scrollToEnd();
  }, [debateMessages, judgments, decision]);

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
                bgClass={name === "Affirmative" ? "bg-red-200 dark:bg-red-800" : "bg-indigo-200 dark:bg-indigo-800"}
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
                bgClass="bg-emerald-200 dark:bg-emerald-800"
              />
            ))}
          </>
        }
        {
          decision && <div className="mx-auto text-center">
            <span>Affirmative: {decision.affirmatives}</span> <span>Negative: {decision.negatives}</span>
            <p className="text-2xl font-bold">Result: {decision.result}</p>
            {
              decision.hasUnknown &&
                <p className="italic">⚠️ Failed to obtain one or more judgments.</p>
            }
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
