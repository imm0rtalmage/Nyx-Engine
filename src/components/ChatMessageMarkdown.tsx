import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy, Terminal } from "lucide-react";

interface ChatMessageMarkdownProps {
  content: string;
  className?: string;
  isUser?: boolean;
  themeId?: string;
}

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  node?: any;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/95 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-purple-400" />
          <span className="text-slate-300 font-semibold">{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed scrollbar-thin">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

export const ChatMessageMarkdown = React.memo(function ChatMessageMarkdown({
  content,
  className = "",
  isUser = false,
  themeId = "default"
}: ChatMessageMarkdownProps) {
  if (!content || !content.trim()) {
    return (
      <span className="text-slate-500 italic">
        [Empty response content - click Regen to generate]
      </span>
    );
  }

  // Accent colors based on active theme
  const getThemeAccentClass = () => {
    switch (themeId) {
      case "cyberpunk":
        return "text-cyan-400 border-cyan-500/40";
      case "emerald":
        return "text-emerald-400 border-emerald-500/40";
      case "crimson":
        return "text-red-400 border-red-500/40";
      case "twilight":
        return "text-amber-400 border-amber-500/40";
      default:
        return "text-purple-400 border-purple-500/40";
    }
  };

  const accentClass = getThemeAccentClass();

  return (
    <div className={`chat-markdown-body ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed break-words">
              {children}
            </p>
          ),

          // Bold / Strong
          strong: ({ children }) => (
            <strong className="font-bold text-slate-100 tracking-wide">
              {children}
            </strong>
          ),

          // Italic / Emphasis
          em: ({ children }) => (
            <em className="italic text-slate-200/95 font-serif opacity-95">
              {children}
            </em>
          ),

          // Code blocks & inline code
          code: ({ node, className: codeClassName, children, ...props }) => {
            // If multiline or has language class or is inside pre, treat as code block
            const isMultiline = String(children).includes("\n");
            const hasLanguage = Boolean(codeClassName && codeClassName.includes("language-"));

            if (isMultiline || hasLanguage) {
              return <CodeBlock className={codeClassName}>{children}</CodeBlock>;
            }

            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-950/80 text-purple-300 font-mono text-[0.88em] border border-purple-900/40 shadow-xs inline-block"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Pre formatted container - let CodeBlock handle inner code
          pre: ({ children }) => <>{children}</>,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className={`border-l-2 ${accentClass} bg-slate-950/40 pl-3.5 py-1.5 my-2.5 italic text-slate-300/90 rounded-r-lg shadow-inner text-[0.95em]`}>
              {children}
            </blockquote>
          ),

          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-800 tracking-wide">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-slate-100 mt-3.5 mb-1.5 tracking-wide">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-slate-200 mt-3 mb-1 uppercase font-mono tracking-wider">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-slate-300 mt-2.5 mb-1">
              {children}
            </h4>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 mb-2.5 space-y-1 text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-2.5 space-y-1 text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 marker:text-purple-400/70">
              {children}
            </li>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-500/50 hover:decoration-purple-300 transition-colors font-medium cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-md">
              <table className="min-w-full text-xs text-left divide-y divide-slate-800">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-900/90 text-slate-300 font-mono uppercase text-[10px] tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-850/60 text-slate-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-900/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-slate-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-slate-300/90 whitespace-normal">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-slate-800/80" />
          ),

          // Images inside chat
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || "Message image"}
              className="rounded-xl border border-slate-800 max-h-80 max-w-full object-cover my-2 shadow-lg"
              referrerPolicy="no-referrer"
            />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});

export default ChatMessageMarkdown;
