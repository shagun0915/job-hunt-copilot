/**
 * Extract plain text from an uploaded resume. Supports PDF, DOCX and plain text.
 * Heavy parsers are imported lazily so they never touch the edge/runtime bundle.
 */
export async function extractResumeText(
  buf: Buffer,
  mimeType: string | undefined,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");
  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx");

  if (isPdf) {
    // unpdf ships a serverless-safe pdf.js build — no DOMMatrix / canvas deps,
    // so it works in the Vercel Node runtime where `pdf-parse` throws.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return normalize(Array.isArray(text) ? text.join("\n") : text);
  }

  if (isDocx) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return normalize(value);
  }

  // treat everything else as utf-8 text (.txt, .md, pasted content saved as file)
  return normalize(buf.toString("utf8"));
}

function normalize(s: string) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
