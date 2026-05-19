import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Copy, Link2, Loader2, Sparkles } from "lucide-react";
import "./styles.css";

const LINKS_API_PATH = "/api/links";

function App() {
  const [url, setUrl] = useState("");
  const [shortLink, setShortLink] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function createShortLink(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    setShortLink(null);
    setCopied(false);

    try {
      const response = await fetch(LINKS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось сократить ссылку");
      }

      setShortLink(data.link);
      setUrl("");
      setStatus("success");
    } catch (error) {
      setMessage(error.message);
      setStatus("error");
    }
  }

  async function copyShortLink() {
    if (!shortLink) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(shortLink.shortUrl);
      } else {
        const textarea = document.createElement("textarea");
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        textarea.value = shortLink.shortUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.append(textarea);
        textarea.select();

        const copiedWithFallback = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (range && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }

        if (!copiedWithFallback) {
          throw new Error("Не удалось скопировать ссылку");
        }
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (_error) {
      setMessage("Не удалось скопировать ссылку. Скопируй ее вручную.");
    }
  }

  return (
    <main className="app-shell">
      <p className="domain-name">fesko.fun</p>
      <section className="shortener">
        <header className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Link2 size={24} />
          </span>
          <span className="brand-name">Short Service</span>
        </header>

        <form className="shortener-form" onSubmit={createShortLink}>
          <label className="url-field">
            <span>Длинная ссылка</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/very/long/url"
              required
            />
          </label>

          <button className="submit-button" disabled={status === "submitting"}>
            {status === "submitting" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            Сократить
          </button>
        </form>

        {message && <div className="alert">{message}</div>}

        {shortLink && (
          <section className="result" aria-live="polite">
            <a href={shortLink.shortUrl} target="_blank" rel="noreferrer">
              {shortLink.shortUrl}
            </a>
            <button className="copy-button" onClick={copyShortLink}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
