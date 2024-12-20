import { ReactNode } from "react";
import Markdown from "react-markdown";

export default function Bubble(
  { name, content, suffix, footer, chatClass = "chat-start", bgClass = "" }
  : { name: string, content: string, suffix?: ReactNode, footer?: ReactNode, chatClass?: "chat-start" | "chat-end", bgClass?: string }
) {
  return (
    <div className={`chat ${chatClass}`}>
      <div className="chat-image avatar placeholder">
        <div className="w-10 rounded-full">
          <span>{name[0]}</span>
        </div>
      </div>
      <div className="chat-header">
        {name}
        {
          suffix && <time className="text-xs opacity-50">{suffix}</time>
        }
      </div>
      <Markdown className={`chat-bubble ${bgClass} bg-base-200 text-base-content`}>{content}</Markdown>
      {
        footer && <div className="chat-footer opacity-50">{footer}</div>
      }
    </div>
  );
}