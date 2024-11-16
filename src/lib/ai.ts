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
  content: string,
  duration?: number,
  tokens?: number
}

export interface Judgment {
  message: ChatBotMessage,
  judgement: "A" | "N" | "U"
}

export interface Decision {
  result: string,
  judgments: Judgment[],
  affirmatives: number,
  negatives: number,
  hasUnknown: boolean
}

export type History = ChatBotMessage[]

export class Chatbot {
  name: string;
  config: ChatbotConfig;
  system_prompt: string;
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];

  constructor(name: string, system_prompt: string, config: ChatbotConfig) {
    this.name = name;
    this.config = config;
    this.system_prompt = system_prompt;
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
      content: message.content,
      duration: res.usage?.completion_time,
      tokens: res.usage?.completion_tokens
    } as ChatBotMessage;
  }
  
  insert(prompt: string, index: number = 0) {
    this.messages.splice(index, 0, {
        "role": "assistant",
        "content": prompt
    });
  }

  forgetAll() {
    this.messages = [{
      "role": "system",
      "content": this.system_prompt
    }];
  }

  loadHistory(history: History) {
    this.forgetAll();
    history.forEach((message) => this.messages.push({
      role: message.name === this.name ? "assistant" : "user",
      content: message.content
    }));
  }
}

const create_affirmative_bot = (agenda: string, config: ChatbotConfig) => new Chatbot(
    "Affirmative",
    `You are positive about the agenda of \"${agenda}\". `
    + "Summarize the evidence and reasons for affirmation at the beginning, "
    + "then debate with another bot. "
    + "Please answer questions succinctly."
    + `Please answer in ${config.maxWords} words or less.`,
    config
);

const create_negative_bot = (agenda: string, config: ChatbotConfig) => new Chatbot(
    "Negative",
    `You are negative about the agenda of \"${agenda}\". `
    + "Summarize the evidence and reasons for negation at the beginning, "
    + "then debate with another bot. "
    + "Please answer questions succinctly."
    + `Please answer in ${config.maxWords} words or less.`,
    config
);

const create_judge_bot = (i: number, agenda: string, config: ChatbotConfig) => new Chatbot(
  `judge${i + 1}`,
  `You are the judge who will reach a conclusion on the agenda item \"${agenda}\". `
  + "You must look at the minutes of the proceedings of "
  + "the affirmative and the negative and make sure that "
  + "you come to one final conclusion."
  + "Please answer questions succinctly."
  + `Please answer in ${config.maxWords} words or less.`
  + "At the very end, write <j>A</j> if you yourself are positive and <j>N</j> if you are negative.",
  config
);

function createProceedings(agenda: string, history: History) {
  return `Proceedings of the debate on "${agenda}":\n`
    + history.map((message) => `${message.name}: ${message.content}`).join("\n");
}

export async function debate(agenda: string, num_iterations: number, config: ChatbotConfig) {
  const affirmative_bot = create_affirmative_bot(agenda, config);
  const negative_bot = create_negative_bot(agenda, config);

  let affirmative_bot_content: string | null = null;
  let negative_bot_content = "(Chairman): Please start the debate.";

  const history: History = [];

  for (let i = 0; i < num_iterations; i++) {
      const message = await affirmative_bot.chat(negative_bot_content);
      if (!message.content) {
        throw new Error("no content");
      }
      affirmative_bot_content = message.content;
      history.push(message);

      const message2 = await negative_bot.chat(affirmative_bot_content);
      if (!message2.content) {
        throw new Error("no content");
      }
      negative_bot_content = message2.content;
      history.push(message2);
  }

  return history;
}

export async function debateProgressive(agenda: string, history: History, config: ChatbotConfig) {
  const affirmative_bot = create_affirmative_bot(agenda, config);
  const negative_bot = create_negative_bot(agenda, config);
  affirmative_bot.loadHistory(history);
  negative_bot.loadHistory(history);

  const negative_bot_content = history.length === 0 ? "(Chairman): Please start the debate." : history[history.length - 1].content;
  const message = await affirmative_bot.chat(negative_bot_content);
  if (!message.content) {
    throw new Error("no content");
  }
  const affirmative_bot_content = message.content;
  history.push(message);

  const message2 = await negative_bot.chat(affirmative_bot_content);
  if (!message2.content) {
    throw new Error("no content");
  }
  history.push(message2);
  
  return history;
}

export async function judge(agenda: string, i: number, history: History, config: ChatbotConfig) {
  const judge = create_judge_bot(i, agenda, config);
  const proceedings = createProceedings(agenda, history);
  const message = await judge.chat(proceedings);
  if (!message.content) {
    throw new Error("no content");
  }
  try {
    return {
      message: {
        ...message,
        content: message.content.replace(/<j>.*<\/j>/, "")
      } as ChatBotMessage,
      judgement: message.content.split("<j>")[1].split("</j>")[0]
    } as Judgment;
  } catch { 
    return {
      message: {
        ...message,
        content: message.content.replace(/<j>.*<\/j>/, "")
      } as ChatBotMessage,
      judgement: "U"
    } as Judgment;
  }
}

export function aggregateJudgments(judgments: Judgment[]) {
  const affirmatives = judgments.filter((j) => j.judgement === "A").length;
  const negatives = judgments.filter((j) => j.judgement === "N").length;
  const hasUnknown = judgments.some((j) => j.judgement === "U");
  return {
    result: affirmatives > negatives ? "Affirmative" : negatives > affirmatives ? "Negative" : "Neutral",
    judgments,
    affirmatives,
    negatives,
    hasUnknown
  } as Decision;
}

export async function makeDecision(
  agenda: string, num_judges: number, history: History, config: ChatbotConfig
) {
  const judgments = await Promise.all(Array.from({ length: num_judges }, (_, i) =>
    judge(agenda, i, history, config)
  ));
  return aggregateJudgments(judgments);
}
