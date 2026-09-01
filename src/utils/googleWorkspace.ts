import JSZip from "jszip";

/**
 * Google Workspace Helper functions using direct REST APIs with OAuth access token.
 */

export function safeParseJson<T = any>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) return fallback;
  const trimmed = rawText.trim();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype")) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

// 1. Fetch Google Doc/File content with type-specific parsers
export async function fetchGoogleFile(
  accessToken: string,
  docId: string,
  mimeType?: string,
  signal?: AbortSignal
): Promise<{ text: string; fileBase64?: string; fileMimeType?: string }> {
  const cleanId = extractDocId(docId);
  if (!accessToken || accessToken === "mock" || accessToken.startsWith("mock-")) {
    return { text: "[Mock Mode: Unable to fetch live Google Drive content without valid OAuth token]" };
  }

  const checkMime = (mimeType || "").toLowerCase();
  const isGoogleAppsDoc = !mimeType || checkMime.startsWith("application/vnd.google-apps.");

  const parseErrorText = async (res: Response, prefix: string): Promise<string> => {
    let detail = "";
    try {
      const rawText = await res.text();
      if (rawText && rawText.trim()) {
        const errJson = safeParseJson<any>(rawText, null);
        if (errJson) {
          detail = errJson.error?.message || errJson.message || (typeof errJson.error === "string" ? errJson.error : "");
        } else if (rawText.startsWith("<")) {
          detail = "Server returned an HTML error/login page instead of API data.";
        } else {
          detail = rawText.slice(0, 300);
        }
      }
    } catch {
      detail = "";
    }
    const statusInfo = res.status ? `HTTP ${res.status}` : "";
    const statusText = res.statusText || (res.status === 401 ? "Unauthorized" : res.status === 403 ? "Forbidden" : res.status === 404 ? "Not Found" : "");
    const combined = [statusInfo, statusText, detail].filter(Boolean).join(" - ");
    return `${prefix}: ${combined || "Request failed"}`;
  };

  let lastErrorMessage = "";

  // Strategy A: If it's a Google Apps file (Doc, Sheet, Slide, etc.) or mimeType unknown, attempt export
  if (isGoogleAppsDoc) {
    let exportMime = "text/plain";
    if (checkMime === "application/vnd.google-apps.spreadsheet") {
      exportMime = "text/csv";
    }
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${cleanId}/export?mimeType=${exportMime}`;
    const proxyUrl = `/api/google-proxy?url=${encodeURIComponent(exportUrl)}`;
    
    try {
      const response = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) return { text };
      } else {
        lastErrorMessage = await parseErrorText(response, "Google Drive export error");
      }
    } catch (err: any) {
      lastErrorMessage = `Export request failed: ${err.message || String(err)}`;
    }

    // Strategy B: Fallback to Google Docs API for documents
    if (!checkMime || checkMime === "application/vnd.google-apps.document") {
      const docUrl = `https://docs.googleapis.com/v1/documents/${cleanId}`;
      const proxyDocUrl = `/api/google-proxy?url=${encodeURIComponent(docUrl)}`;
      try {
        const docResponse = await fetch(proxyDocUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        });
        if (docResponse.ok) {
          const rawDocText = await docResponse.text();
          const docData = safeParseJson<any>(rawDocText, {});
          let bodyText = "";
          if (docData.body && docData.body.content) {
            docData.body.content.forEach((element: any) => {
              if (element.paragraph && element.paragraph.elements) {
                element.paragraph.elements.forEach((el: any) => {
                  if (el.textRun && el.textRun.content) {
                    bodyText += el.textRun.content;
                  }
                });
              }
            });
          }
          if (bodyText && bodyText.trim()) return { text: bodyText };
        } else {
          lastErrorMessage = await parseErrorText(docResponse, "Google Docs API error");
        }
      } catch (err: any) {
        lastErrorMessage = `Docs API request failed: ${err.message || String(err)}`;
      }
    }
  }

  // Strategy C: Try standard Drive Media / Alt=Media API
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${cleanId}?alt=media`;
  const proxyMediaUrl = `/api/google-proxy?url=${encodeURIComponent(mediaUrl)}`;
  try {
    const response = await fetch(proxyMediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });

    if (response.ok) {
      if (
        checkMime.startsWith("text/") || 
        checkMime === "application/json" || 
        checkMime === "application/xml" ||
        checkMime === "application/javascript" ||
        !checkMime
      ) {
        const text = await response.text();
        return { text };
      } else if (checkMime === "application/pdf" || checkMime.startsWith("image/")) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              text: checkMime === "application/pdf" 
                ? `[Binary PDF file retrieved from Google Drive]` 
                : `[Image file retrieved from Google Drive]`,
              fileBase64: reader.result as string,
              fileMimeType: mimeType
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (checkMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const zip = new JSZip();
            zip.loadAsync(arrayBuffer).then(zipFile => {
              const docXmlFile = zipFile.file("word/document.xml");
              if (!docXmlFile) {
                resolve({ text: `[Error reading docx: Could not find word/document.xml]` });
                return;
              }
              docXmlFile.async("text").then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");
                const textNodes = xmlDoc.getElementsByTagName("w:t");
                let result = "";
                for (let i = 0; i < textNodes.length; i++) {
                  result += textNodes[i].textContent || "";
                }
                resolve({ text: result || "[Empty Document]" });
              }).catch(err => {
                resolve({ text: `[Error parsing docx XML: ${err.message}]` });
              });
            }).catch(err => {
              resolve({ text: `[Error unzipping docx: ${err.message}]` });
            });
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
      } else {
        const text = await response.text();
        return { text };
      }
    } else {
      lastErrorMessage = await parseErrorText(response, "Google Drive media fetch error");
    }
  } catch (err: any) {
    if (!lastErrorMessage) {
      lastErrorMessage = `Media fetch failed: ${err.message || String(err)}`;
    }
  }

  // Strategy D: Try fetching metadata/description as a ultimate fallback
  try {
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id%2Cname%2Cdescription%2CmimeType`;
    const proxyMetaUrl = `/api/google-proxy?url=${encodeURIComponent(metaUrl)}`;
    const metaResp = await fetch(proxyMetaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (metaResp.ok) {
      const metaText = await metaResp.text();
      const meta = safeParseJson<any>(metaText, {});
      if (meta.description) {
        return { text: `[Document: ${meta.name}]\nDescription: ${meta.description}` };
      }
    }
  } catch {}

  const finalMsg = lastErrorMessage || "Unable to download file content from Google Drive. Check permissions or re-connect account.";
  if (finalMsg.includes("401") || finalMsg.includes("403") || finalMsg.includes("Unauthorized") || finalMsg.includes("Forbidden")) {
    console.warn("Google Drive fetch unauthorized:", finalMsg);
  } else {
    console.error("Failed to fetch file content from Google Drive via proxy:", finalMsg);
  }
  throw new Error(finalMsg);
}

// Wrapper for backward compatibility
export async function fetchGoogleDoc(accessToken: string, docId: string): Promise<string> {
  const result = await fetchGoogleFile(accessToken, docId);
  return result.text;
}

// 2. Export narrative to a new Google Doc
export async function createGoogleDoc(accessToken: string, title: string, content: string): Promise<string> {
  if (!accessToken || accessToken === "mock" || accessToken.startsWith("mock-")) {
    throw new Error("No valid Google account connected. Please sign in with Google to export to Google Docs.");
  }

  // Google Docs API insertText rejects carriage returns (\r). Strip \r and normalize to \n.
  const sanitizedContent = (content || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const docTitle = (title || "Nyx Roleplay Export").trim();

  const parseErrorDetail = async (res: Response, prefix: string): Promise<string> => {
    let detail = "";
    try {
      const rawText = await res.text();
      if (rawText && rawText.trim()) {
        try {
          const errJson = JSON.parse(rawText);
          detail = errJson.error?.message || errJson.message || (typeof errJson.error === "string" ? errJson.error : rawText);
        } catch {
          detail = rawText;
        }
      }
    } catch {
      detail = "";
    }
    if (res.status === 401 || res.status === 403 || detail.includes("invalid authentication credentials")) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
      }
      return `${prefix}: HTTP ${res.status} - Google authorization session expired or unauthorized. Please re-authenticate your Google account in Settings or the Drive modal.`;
    }
    const statusInfo = res.status ? `HTTP ${res.status}` : "";
    const statusText = res.statusText || "";
    const combined = [statusInfo, statusText, detail].filter(Boolean).join(" - ");
    return `${prefix}: ${combined || "Request failed"}`;
  };

  try {
    let docId = "";

    // Strategy A: Try server-side dedicated helper first for maximum reliability
    try {
      const serverRes = await fetch("/api/google-workspace/create-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: accessToken,
          title: docTitle,
          content: sanitizedContent
        })
      });

      if (serverRes.status === 401 || serverRes.status === 403) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
        }
        throw new Error("HTTP 401 - Google authorization session expired or unauthorized. Please re-authenticate your Google account in Settings or the Drive modal.");
      }

      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData.docId) {
          return serverData.docId;
        }
      }
    } catch (serverErr: any) {
      if (serverErr.message && (serverErr.message.includes("401") || serverErr.message.includes("expired") || serverErr.message.includes("unauthorized"))) {
        throw serverErr;
      }
      console.warn("Direct server create-doc attempt encountered error, trying proxy fallback...", serverErr);
    }

    // Strategy B: Create document using Google Docs API (POST https://docs.googleapis.com/v1/documents)
    const targetCreateUrl = "https://docs.googleapis.com/v1/documents";
    const proxyCreateUrl = `/api/google-proxy?url=${encodeURIComponent(targetCreateUrl)}`;
    
    let createResponse = await fetch(proxyCreateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: docTitle }),
    });

    if (createResponse.status === 401 || createResponse.status === 403) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
      }
      throw new Error("HTTP 401 - Google authorization session expired or unauthorized. Please re-authenticate your Google account in Settings or the Drive modal.");
    }

    if (createResponse.ok) {
      const resText = await createResponse.text();
      if (resText && resText.trim()) {
        try {
          const newDoc = JSON.parse(resText);
          docId = newDoc.documentId || newDoc.id || "";
        } catch {}
      }
    }

    if (!docId) {
      // Strategy C: Fallback to Google Drive API (POST https://www.googleapis.com/drive/v3/files)
      console.warn("Docs API document creation returned non-200 or empty id, attempting Drive API fallback...");
      const driveCreateUrl = "https://www.googleapis.com/drive/v3/files";
      const proxyDriveUrl = `/api/google-proxy?url=${encodeURIComponent(driveCreateUrl)}`;
      const driveResponse = await fetch(proxyDriveUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: docTitle,
          mimeType: "application/vnd.google-apps.document",
        }),
      });

      if (driveResponse.status === 401 || driveResponse.status === 403) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
        }
        throw new Error("HTTP 401 - Google authorization session expired or unauthorized. Please re-authenticate your Google account in Settings or the Drive modal.");
      }

      if (driveResponse.ok) {
        const driveText = await driveResponse.text();
        if (driveText && driveText.trim()) {
          try {
            const driveDoc = JSON.parse(driveText);
            docId = driveDoc.id || driveDoc.documentId || "";
          } catch {}
        }
      } else {
        const errDetail = await parseErrorDetail(createResponse.ok ? driveResponse : createResponse, "Failed to create Google Doc");
        throw new Error(errDetail);
      }
    }

    if (!docId) {
      throw new Error("Google API created the document but failed to return a valid document ID.");
    }

    // Step B: Write text into the Doc if there is content
    if (sanitizedContent.trim().length > 0) {
      const targetUpdateUrl = `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`;
      const proxyUpdateUrl = `/api/google-proxy?url=${encodeURIComponent(targetUpdateUrl)}`;
      
      const updateResponse = await fetch(proxyUpdateUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: sanitizedContent,
              },
            },
          ],
        }),
      });

      if (!updateResponse.ok) {
        const updateErr = await parseErrorDetail(updateResponse, "Failed to write text content into Google Doc");
        throw new Error(updateErr);
      }
    }

    return docId;
  } catch (err: any) {
    const errMsg = err.message || "";
    if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized") || errMsg.includes("Forbidden") || errMsg.includes("authentication credentials")) {
      console.warn("Google Doc Export failed due to expired or unauthorized session:", err.message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
      }
    } else {
      console.error("Google Doc Export Error:", err);
    }
    throw err;
  }
}

// 2b. Sync/Update existing Google Doc content
export async function updateGoogleDoc(accessToken: string, docId: string, content: string): Promise<void> {
  if (!accessToken || accessToken === "mock" || accessToken.startsWith("mock-")) {
    throw new Error("No valid Google account connected. Please sign in with Google in Settings to sync Google Docs.");
  }
  if (!docId) {
    throw new Error("No Google Doc ID provided for sync.");
  }

  const sanitizedContent = (content || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parseErrorDetail = async (res: Response, prefix: string): Promise<string> => {
    let detail = "";
    try {
      const rawText = await res.text();
      if (rawText && rawText.trim()) {
        try {
          const errJson = JSON.parse(rawText);
          detail = errJson.error?.message || errJson.message || (typeof errJson.error === "string" ? errJson.error : rawText);
        } catch {
          detail = rawText;
        }
      }
    } catch {
      detail = "";
    }
    const statusInfo = res.status ? `HTTP ${res.status}` : "";
    const statusText = res.statusText || "";
    const combined = [statusInfo, statusText, detail].filter(Boolean).join(" - ");
    return `${prefix}: ${combined || "Request failed"}`;
  };

  const targetUpdateUrl = `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`;
  const proxyUpdateUrl = `/api/google-proxy?url=${encodeURIComponent(targetUpdateUrl)}`;

  const updateResponse = await fetch(proxyUpdateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: sanitizedContent,
          },
        },
      ],
    }),
  });

  if (!updateResponse.ok) {
    const updateErr = await parseErrorDetail(updateResponse, "Failed to update Google Doc");
    throw new Error(updateErr);
  }
}

// Helper to extract Doc ID from a full Google Docs URL if needed
export function extractDocId(input: string): string {
  if (input.includes("/d/")) {
    const parts = input.split("/d/");
    if (parts[1]) {
      return parts[1].split("/")[0];
    }
  }
  return input.trim();
}

// 3. List Google Docs and other supported document/media formats from Google Drive with dynamic search and tab filtering
export interface ListGoogleDocsOptions {
  search?: string;
  tab?: "recent" | "my_drive" | "shared" | "starred";
  mimeTypeFilter?: "all" | "document" | "pdf" | "image";
}

export async function listGoogleDocs(accessToken: string, options?: ListGoogleDocsOptions): Promise<any[]> {
  const search = options?.search;
  const tab = options?.tab;
  const mimeTypeFilter = options?.mimeTypeFilter;

  if (!accessToken || accessToken === "mock" || accessToken.startsWith("mock-")) {
    return [];
  }

  try {
    const queryParts: string[] = ["trashed = false"];

    // 1. Handle Mime Type filtering at API level
    let mimeFilterStr = "";
    if (mimeTypeFilter === "document") {
      mimeFilterStr = "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
    } else if (mimeTypeFilter === "pdf") {
      mimeFilterStr = "mimeType = 'application/pdf'";
    } else if (mimeTypeFilter === "image") {
      mimeFilterStr = "mimeType contains 'image/'";
    } else {
      // All supported formats
      mimeFilterStr = "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'text/html' or mimeType contains 'image/')";
    }
    queryParts.push(mimeFilterStr);

    // 2. Handle Tab filtering at API level
    if (tab === "starred") {
      queryParts.push("starred = true");
    } else if (tab === "shared") {
      queryParts.push("sharedWithMe = true");
    } else if (tab === "my_drive") {
      queryParts.push("'me' in owners");
    }

    // 3. Handle Search filtering at API level
    if (search && search.trim() !== "") {
      const cleanSearch = search.trim().replace(/'/g, "\\'");
      queryParts.push(`name contains '${cleanSearch}'`);
    }

    const q = encodeURIComponent(queryParts.join(" and "));
    
    // Sort ordering
    let orderBy = "modifiedTime desc";
    if (tab === "recent") {
      orderBy = "viewedByMeTime desc,modifiedTime desc";
    }

    const targetListUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id%2Cname%2CmimeType%2CmodifiedTime%2Csize%2CthumbnailLink)&pageSize=100&orderBy=${encodeURIComponent(orderBy)}`;
    const proxyListUrl = `/api/google-proxy?url=${encodeURIComponent(targetListUrl)}`;
    
    const response = await fetch(proxyListUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      let errorMsg = "";
      try {
        const errText = await response.text();
        if (errText && errText.trim()) {
          const errJson = JSON.parse(errText);
          errorMsg = errJson.error?.message || JSON.stringify(errJson);
        } else {
          errorMsg = response.statusText || String(response.status);
        }
      } catch {
        errorMsg = response.statusText || String(response.status);
      }
      throw new Error(`Google Drive API error: ${response.status} - ${errorMsg}`);
    }

    const rawListText = await response.text();
    const data = rawListText && rawListText.trim() ? JSON.parse(rawListText) : {};
    return data.files || [];
  } catch (err: any) {
    const errMsg = err.message || "";
    if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized") || errMsg.includes("Forbidden")) {
      console.warn("Failed to list Google Docs and Drive files due to expired or unauthorized session:", err.message);
    } else {
      console.error("Failed to list Google Docs and Drive files, propagating error:", err);
    }
    throw err;
  }
}

