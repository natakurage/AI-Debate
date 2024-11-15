import { Groq } from "groq-sdk";

// Create the Groq client
const client = new Groq({apiKey: process.env.GROQ_API_KEY});

export interface ChatbotConfig {
  model: string,
  maxWords: number,
  temperature: number
}

const maxTokens = 1024;

export const commonConfig: ChatbotConfig = {
  model: "llama3-70b-8192", maxWords: 100, temperature: 1.2
};

export interface ChatBotMessage {
  name: string,
  content: string
}

export interface Judgment {
  message: ChatBotMessage,
  judgement: "A" | "N" | "U"
}

export interface Decision {
  result: "A" | "N" | "U",
  judgments: Judgment[],
  affirmatives: number,
  negatives: number,
  hasUnknown: boolean
}

export type History = ChatBotMessage[]

export class Chatbot {
  name: string;
  config: ChatbotConfig;
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];

  constructor(name: string, system_prompt: string, config: ChatbotConfig) {
    this.name = name;
    this.config = config;
    this.messages = [
      {
        role: "system",
        content: system_prompt
      }
    ];
  }

  async chat(user_prompt: string) {
    this.messages.push({
      role: "user",
      content: user_prompt
    });
    const res = await client.chat.completions.create({
      model: this.config.model,
      messages: this.messages,
      max_tokens: maxTokens,
      temperature: this.config.temperature
    });
    const message = res.choices[0].message;
    console.log("API call", message.content?.slice(0, 10) + "...");
    this.messages.push(message);
    return {
      name: this.name,
      content: message.content
    } as ChatBotMessage;
  }
  
  insert(prompt: string, index: number = 0) {
    this.messages.splice(index, 0, {
        "role": "assistant",
        "content": prompt
    });
  }
}

export async function debate(agenda: string, num_iterations: number, config: ChatbotConfig) {
  const affirmative_bot = new Chatbot(
      "Affirmative",
      `You are positive about the agenda of \"${agenda}\". `
      + "Summarize the evidence and reasons for affirmation at the beginning, "
      + "then debate with another bot. "
      + "Please answer questions succinctly."
      + `Please answer in ${config.maxWords} words or less.`,
      config
  );
  const negative_bot = new Chatbot(
      "Negative",
      `You are negative about the agenda of \"${agenda}\". `
      + "Summarize the evidence and reasons for negation at the beginning, "
      + "then debate with another bot. "
      + "Please answer questions succinctly."
      + `Please answer in ${config.maxWords} words or less.`,
      config
  );

  let affirmative_bot_content: string | null = null;
  let negative_bot_content = "(Chairman): Please start the debate.";

  const history: History = [];

  for (let i = 0; i < num_iterations; i++) {
      const res = await affirmative_bot.chat(negative_bot_content);
      if (!res.content) {
        throw new Error("no content");
      }
      affirmative_bot_content = res.content;
      history.push(res);

      const res2 = await negative_bot.chat(affirmative_bot_content);
      if (!res2.content) {
        throw new Error("no content");
      }
      negative_bot_content = res2.content;
      history.push(res2);
  }

  return history;
}

export async function makeDecision(
  agenda: string, num_judges: number, history: History, config: ChatbotConfig
) {
  const judges = Array.from({ length: num_judges }, (_, i) =>
      new Chatbot(
          `judge${i + 1}`,
          `You are the judge who will reach a conclusion on the agenda item \"${agenda}\". `
          + "You must look at the minutes of the proceedings of "
          + "the affirmative and the negative and make sure that "
          + "you come to one final conclusion."
          + "Please answer questions succinctly."
          + `Please answer in ${config.maxWords} words or less.`
          + "At the very end, write <j>A</j> if you yourself are positive and <j>N</j> if you are negative.",
          config
      )
  );
  const proceedings = `Proceedings of the debate on "${agenda}":\n`
    + history.map((message) => `${message.name}: ${message.content}`).join("\n");
  const judgments = await Promise.all(judges.map(async (judge) => {
    const res = await judge.chat(proceedings);
    if (!res.content) {
      throw new Error("no content");
    }
    try {
      return {
        message: {
          name: res.name,
          content: res.content.replace(/<j>.*<\/j>/, "")
        } as ChatBotMessage,
        judgement: res.content.split("<j>")[1].split("</j>")[0]
      } as Judgment;
    } catch {
      return {
        message: {
          name: res.name,
          content: res.content.replace(/<j>.*<\/j>/, "")
        } as ChatBotMessage,
        judgement: "U"
      } as Judgment;
    }
  }));
  const num_As = judgments.filter((j) => j.judgement === "A").length;
  const num_Ns = judgments.filter((j) => j.judgement === "N").length;
  
  let result = "Neutral";
  if (num_As > num_Ns)
    result = "Affirmative";
  else
    result = "Negative";
  return {
    result,
    judgments,
    affirmatives: num_As,
    negatives: num_Ns,
    hasUnknown: num_judges - (num_As + num_Ns) > 0
  } as Decision;
}