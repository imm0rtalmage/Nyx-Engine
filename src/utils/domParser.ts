/**
 * Dedicated utility for parsing exported DOM (HTML) strings, JSON chat logs,
 * and TXT/MD files into structured narrative and dialogue messages.
 */

export interface ParsedMessage {
  speaker: string;
  content: string;
  timestamp?: string;
  isOoc?: boolean;
}

/**
 * Main parser function that handles different file extensions and contents.
 */
export function parseExternalChatFile(
  fileName: string,
  rawContent: string
): { messages: ParsedMessage[]; summaryText: string } {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (extension === "json") {
    return parseJsonChat(rawContent);
  } else if (extension === "html" || extension === "htm" || rawContent.trim().startsWith("<")) {
    return parseHtmlDomChat(rawContent);
  } else {
    // Default to plain text or markdown
    return parsePlainTxtChat(rawContent);
  }
}

/**
 * Parses structured JSON array formats.
 */
function parseJsonChat(content: string): { messages: ParsedMessage[]; summaryText: string } {
  try {
    const parsed = JSON.parse(content);
    const messages: ParsedMessage[] = [];

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        // Handle standard formats
        const speaker = item.speaker || item.role || item.sender || item.author || "Narrator";
        const text = item.content || item.text || item.message || item.body || "";
        if (text.trim()) {
          messages.push({
            speaker: speaker.trim(),
            content: text.trim(),
            timestamp: item.timestamp || item.date || undefined,
            isOoc: item.isOoc || item.ooc || false
          });
        }
      }
    } else if (parsed.messages && Array.isArray(parsed.messages)) {
      // Handle nested messages array
      for (const item of parsed.messages) {
        const speaker = item.speaker || item.role || item.sender || item.author || "Narrator";
        const text = item.content || item.text || item.message || item.body || "";
        if (text.trim()) {
          messages.push({
            speaker: speaker.trim(),
            content: text.trim(),
            timestamp: item.timestamp || item.date || undefined,
            isOoc: item.isOoc || item.ooc || false
          });
        }
      }
    }

    if (messages.length > 0) {
      return {
        messages,
        summaryText: formatParsedMessagesToTranscript(messages)
      };
    }
  } catch (err) {
    console.error("JSON parsing failed, falling back to text parsing:", err);
  }

  return parsePlainTxtChat(content);
}

/**
 * High-fidelity HTML DOM parser that reconstructs chats from HTML files.
 */
function parseHtmlDomChat(htmlContent: string): { messages: ParsedMessage[]; summaryText: string } {
  const messages: ParsedMessage[] = [];
  
  if (typeof window === "undefined" || !window.DOMParser) {
    return parsePlainTxtChat(htmlContent.replace(/<[^>]*>/g, ""));
  }

  try {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Remove style, script, SVG, and navigation elements to avoid junk text
    const elementsToRemove = doc.querySelectorAll("style, script, svg, nav, footer, header, noscript, iframe");
    elementsToRemove.forEach(el => el.remove());

    // Strategy 1: Look for explicit chat platforms or common container elements
    // Try to find elements representing chat bubbles, messages, or paragraphs
    const potentialBubbles = doc.querySelectorAll(
      ".message, .chat-bubble, [data-testid*='message'], .messageContent, .chat-message, .bubble, .chat-item, li.chat, div.msg, .chat_message, [class*='message_']"
    );

    if (potentialBubbles.length > 0) {
      potentialBubbles.forEach(bubble => {
        // Search inside for sender name/role
        const senderEl = bubble.querySelector(
          ".sender, .author, .username, .name, [class*='username'], [class*='name'], strong"
        );
        // Search inside for content text
        const textEl = bubble.querySelector(
          ".text, .content, .body, [class*='text'], [class*='content'], p"
        ) || bubble;

        const speakerName = senderEl?.textContent?.trim() || "Speaker";
        let textVal = "";

        if (textEl !== bubble) {
          textVal = textEl.textContent?.trim() || "";
        } else {
          // Exclude sender element text if we are parsing the whole bubble
          const clone = bubble.cloneNode(true) as HTMLElement;
          if (senderEl) {
            const senderClone = clone.querySelector(".sender, .author, .username, .name, strong");
            senderClone?.remove();
          }
          textVal = clone.textContent?.trim() || "";
        }

        if (textVal) {
          messages.push({
            speaker: speakerName,
            content: textVal
          });
        }
      });
    }

    // Strategy 2: If no structured bubbles found, parse consecutive block elements
    if (messages.length === 0) {
      // Collect all paragraphs or text blocks
      const textBlocks = doc.querySelectorAll("p, li, div.text-block, h1, h2, h3, blockquote, span.message-text");
      let currentSpeaker = "Narrator";

      textBlocks.forEach(block => {
        const text = block.textContent?.trim();
        if (!text) return;

        // Check if block starts with an obvious name, e.g. "Bob:" or "Bob - " or "[Bob]"
        const speakerMatch = text.match(/^\[?([A-Za-z0-9\s_]{2,20})\]?:\s*(.*)/);
        if (speakerMatch) {
          currentSpeaker = speakerMatch[1].trim();
          const dialogueText = speakerMatch[2].trim();
          if (dialogueText) {
            messages.push({
              speaker: currentSpeaker,
              content: dialogueText
            });
          }
        } else {
          // If it is dialogue inside quotes, e.g. "Get out!" he yelled
          // Treat as dialogue or prose narrated
          messages.push({
            speaker: currentSpeaker,
            content: text
          });
        }
      });
    }

    // Clean up parsed messages
    const cleanedMessages = messages.filter(m => m.content.trim() !== "");

    if (cleanedMessages.length > 0) {
      return {
        messages: cleanedMessages,
        summaryText: formatParsedMessagesToTranscript(cleanedMessages)
      };
    }
  } catch (err) {
    console.error("DOM parsing failed, falling back to text regex parsing:", err);
  }

  // Strategy 3: Fallback text regex parser on stripped HTML
  const strippedText = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "\n")
    .replace(/\n\s*\n/g, "\n");
    
  return parsePlainTxtChat(strippedText);
}

/**
 * Parses raw text or markdown logs.
 */
function parsePlainTxtChat(content: string): { messages: ParsedMessage[]; summaryText: string } {
  const messages: ParsedMessage[] = [];
  const lines = content.split(/\n+/);
  let currentSpeaker = "Narrator";
  let accumulateContent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for "Name:" or "[Name]" or "**Name**" or "Name (OOC):"
    const nameMatch = trimmed.match(/^(\*\*|\[)?([A-Za-z0-9\s_]{2,24})(\*\*|\])?(?:\s*\(OOC\))?:\s*(.*)/i);
    
    if (nameMatch) {
      // Save prior speaker block if any
      if (accumulateContent.trim()) {
        messages.push({
          speaker: currentSpeaker,
          content: accumulateContent.trim(),
          isOoc: currentSpeaker.toLowerCase().includes("ooc")
        });
      }
      currentSpeaker = nameMatch[2].trim();
      accumulateContent = nameMatch[4].trim();
    } else {
      // Accumulate or create dynamic narrator beat
      if (accumulateContent) {
        accumulateContent += "\n" + trimmed;
      } else {
        currentSpeaker = "Narrator";
        accumulateContent = trimmed;
      }
    }
  }

  // Push final message
  if (accumulateContent.trim()) {
    messages.push({
      speaker: currentSpeaker,
      content: accumulateContent.trim(),
      isOoc: currentSpeaker.toLowerCase().includes("ooc")
    });
  }

  // If we couldn't structure it nicely into multiple speakers, treat the entire file as a single Narrator block
  if (messages.length <= 1) {
    return {
      messages: [{ speaker: "Narrator", content: content.trim() }],
      summaryText: content.trim()
    };
  }

  return {
    messages,
    summaryText: formatParsedMessagesToTranscript(messages)
  };
}

/**
 * Formats a list of ParsedMessage objects into a standardized transcript layout.
 */
function formatParsedMessagesToTranscript(messages: ParsedMessage[]): string {
  return messages
    .map(m => {
      const prefix = m.isOoc ? "[OOC] " : "";
      return `**${m.speaker}**: ${prefix}${m.content}`;
    })
    .join("\n\n");
}
