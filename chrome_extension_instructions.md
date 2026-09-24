# Nyx External Chat DOM Exporter (Chrome Extension)

This guide provides the complete source code and instructions to install a custom, light-weight Google Chrome Extension. It extracts the conversation DOM tree directly from external websites and playgrounds and downloads it as an `.html` file, ready for high-fidelity importing into the **Nyx Narrative Editing Suite**.

---

## 💡 Important: Understanding Dynamic Chat Loading & DOM Virtualization
Modern chat platforms (like ChatGPT, Claude, Character.ai, NovelAI) use **virtualization** and **dynamic lazy-loading** to keep browser performance smooth. This means they only render messages that are currently visible on or near your screen into the HTML DOM.
- **Why did it only export part of my chat?** If you have a very long conversation, the browser unloads or hasn't yet rendered the early messages from memory until you scroll back up to them.
- **The 1-Second Solution:** Before clicking the extension's **Export** button, simply **scroll up to the top of your chat history** once. This triggers the platform to render all previous messages in the DOM. Once fully rendered, the exporter will capture the entire conversation in a single sweep!

---

## Why HTML DOM is the Best Format
An **HTML DOM export** preserves the exact structural nodes (message bubbles, author names, custom styling hints, and chronological flow) of the active conversation without requiring you to scroll and copy manually. 
- You do **not** need to scroll the entire page; the DOM is already resident in the browser memory!
- Our parser will automatically ingest this `.html` file, strip scripts/styles, extract chronological dialogue threads, and convert them to clean prose.

---

## 🛠️ Step 1: Create the Extension Files
Create a new directory on your computer named `nyx-exporter` and save the following four files inside it:

### 1. `manifest.json`
This declares the extension's metadata, permissions, and browser action.
```json
{
  "manifest_version": 3,
  "name": "Nyx Chat DOM Exporter",
  "version": "1.0",
  "description": "Exports raw chat container DOMs for instant Narrative Suite uploading.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html"
  }
}
```

### 2. `popup.html`
The user interface popup for the extension.
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 260px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      margin: 0;
      padding: 14px;
    }
    h3 {
      font-size: 14px;
      margin: 0 0 4px 0;
      color: #a855f7;
    }
    p {
      font-size: 11px;
      color: #94a3b8;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    button {
      width: 100%;
      background: #a855f7;
      color: white;
      border: none;
      padding: 9px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
    }
    button:hover:not(:disabled) {
      background: #9333ea;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .status {
      font-size: 10px;
      color: #10b981;
      margin-top: 10px;
      text-align: center;
      display: none;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <h3>Nyx DOM Exporter</h3>
  <p>Download active chat playground or session DOMs with virtualized element mounting.</p>
  <button id="export-btn">Export Active Chat DOM</button>
  <div id="status-text" class="status">Export completed successfully!</div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### 3. `popup.js`
Injects the content extraction script into the active tab, executes an asynchronous micro-scroll loop to mount virtualized DOM elements, and triggers the file download.
```javascript
document.getElementById("export-btn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById("status-text");
  const exportBtn = document.getElementById("export-btn");
  
  exportBtn.disabled = true;
  status.textContent = "Scanning & mounting virtualized DOM elements...";
  status.style.display = "block";
  status.style.color = "#c084fc";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: exportChatDOM
    });

    if (results && results[0] && results[0].result) {
      const htmlContent = results[0].result;
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat_dom_export_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      status.textContent = "Export completed successfully!";
      status.style.color = "#10b981";
      setTimeout(() => {
        status.style.display = "none";
        exportBtn.disabled = false;
      }, 3000);
    } else {
      throw new Error("No chat DOM content found on the active page.");
    }
  } catch (err) {
    status.textContent = "Export failed: " + (err.message || "Unknown error");
    status.style.color = "#f87171";
    exportBtn.disabled = false;
  }
});

// Executed in the context of the active tab
async function exportChatDOM() {
  // 1. Semantic and framework-agnostic selectors for message turns and containers
  const messageSelectors = [
    "article",
    "[data-message-author-role]",
    "[data-testid*='message']",
    "[data-testid*='conversation-turn']",
    ".message",
    "[class*='ChatMessage']",
    "[class*='MessageItem']"
  ];

  const containerSelectors = [
    "main",
    "[role='log']",
    "[role='presentation']",
    ".chat-container",
    ".messages-wrapper",
    ".message-feed",
    "[class*='chat-container']",
    "[class*='conversation-stream']",
    "[class*='messages-container']",
    "[class*='feed']",
    "[class*='chat']"
  ];

  // Helper to find the scrollable container ancestor
  function findScrollContainer(element) {
    let current = element;
    while (current && current !== document.body && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
        return current;
      }
      current = current.parentElement;
    }
    return document.scrollingElement || document.documentElement || document.body;
  }

  // 2. Identify target chat feed container
  let targetContainer = null;
  const sampleMessage = document.querySelector(messageSelectors.join(", "));
  if (sampleMessage) {
    targetContainer = sampleMessage.closest("main, [role='log'], .chat-container, [class*='conversation'], [class*='feed']") || sampleMessage.parentElement;
  }

  if (!targetContainer) {
    for (const selector of containerSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        targetContainer = el;
        break;
      }
    }
  }

  const exportNode = targetContainer || document.querySelector("main") || document.body;
  const scrollContainer = findScrollContainer(exportNode);

  // 3. Asynchronous micro-scroll loop to mount virtualized DOM elements before export
  if (scrollContainer) {
    const originalScrollTop = scrollContainer.scrollTop;
    if (originalScrollTop > 0) {
      const step = Math.max(150, Math.floor(scrollContainer.clientHeight / 3));
      while (scrollContainer.scrollTop > 0) {
        scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - step);
        // Yield execution to allow virtual list listeners to trigger and mount elements
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      // Brief stabilization delay at the top
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  // 4. Wrap exported innerHTML into a valid HTML document
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nyx DOM Chat Export</title>
</head>
<body>
  <div class="nyx-imported-chat-container">
    ${exportNode.innerHTML}
  </div>
</body>
</html>`;
}
```

---

## ⚡ Step 2: Install the Extension in Google Chrome
1. Open Google Chrome and navigate to **`chrome://extensions/`**.
2. Enable the **"Developer mode"** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left.
4. Select your `nyx-exporter` directory.
5. The extension will now appear in your extension toolbar. Click the jigsaw icon to pin it!

---

## 📥 Step 3: Run the Exporter & Ingest
1. Go to any chat playground (e.g. ChatGPT, Claude, Character.ai, NovelAI).
2. Click the **Nyx Chat DOM Exporter** icon in your toolbar, and click **Export Active Chat DOM**.
3. It will immediately download a `.html` file.
4. Drag and drop this `.html` file into the **Import External Chat** panel in the **Narrative Editing Suite** to parse, clean, and convert it instantly!
