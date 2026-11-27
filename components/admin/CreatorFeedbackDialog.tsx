"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FEEDBACK_CATEGORIES, type CreatorFeedbackItem, type FeedbackCategory } from "@/lib/social/feedbackTypes";
import { CloseIcon, StarIcon } from "./icons";
import styles from "./admin.module.css";
import fb from "./feedbackDialog.module.css";

const RATING_LABELS: Record<number, string> = {
  1: "Difícil de usar",
  2: "Um pouco confusa",
  3: "Boa",
  4: "Muito boa",
  5: "Adorando!",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function CreatorFeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname() ?? "/admin";

  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const [history, setHistory] = useState<CreatorFeedbackItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      setError("");
      fetch("/api/social/feedback", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && Array.isArray(data.items)) {
            setHistory(data.items as CreatorFeedbackItem[]);
          }
        })
        .catch(() => {});
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    setSent(false);
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) {
      setError("Escreva sua mensagem ou sugestão antes de enviar.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/social/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          message: message.trim(),
          page: pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Não foi possível enviar sua mensagem.");
      }
      if ((data as { item?: CreatorFeedbackItem }).item) {
        setHistory(prev => [(data as { item: CreatorFeedbackItem }).item, ...prev]);
      }
      setMessage("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className={fb.dialog}
      aria-labelledby="creator-feedback-title"
      onCancel={e => {
        e.preventDefault();
        handleClose();
      }}
      onClick={e => {
        if (e.target === ref.current) handleClose();
      }}
    >
      <div className={fb.body}>
        <div className={fb.head}>
          <div>
            <h2 id="creator-feedback-title" className={fb.title}>Falar com o criador</h2>
            <p className={fb.subtitle}>
              Mande sugestões do que está faltando, peça ajuda ou avalie como está sua experiência na plataforma.
            </p>
          </div>
          <button type="button" className={fb.closeBtn} onClick={handleClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>

        {sent ? (
          <div className={fb.successBox} role="status">
            <strong>Mensagem enviada com sucesso!</strong>
            <p>
              Seu recado chegou para o criador da plataforma e ficou registrado aqui. Obrigado por ajudar a deixar tudo cada vez melhor.
            </p>
            <div className={fb.actions}>
              <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setSent(false)}>
                Enviar outra mensagem
              </button>
              <button type="button" className={`${styles.button} ${styles.primary} ${styles.small}`} onClick={handleClose}>
                Voltar para o painel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={e => void handleSubmit(e)} style={{ display: "grid", gap: 16 }}>
            <div className={fb.section}>
              <span className={fb.label}>Como está sua experiência?</span>
              <div className={fb.starsRow} role="radiogroup" aria-label="Avaliação da experiência">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} de 5 estrelas: ${RATING_LABELS[n]}`}
                    className={fb.starBtn}
                    data-active={n <= rating}
                    onClick={() => setRating(n)}
                  >
                    <StarIcon filled={n <= rating} />
                  </button>
                ))}
                <span className={fb.starCaption}>{RATING_LABELS[rating]}</span>
              </div>
            </div>

            <div className={fb.section}>
              <span className={fb.label}>Sobre o que você quer falar?</span>
              <div className={fb.chips} role="group" aria-label="Categoria da mensagem">
                {FEEDBACK_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={fb.chip}
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={fb.section}>
              <span className={fb.label}>Sua mensagem</span>
              <textarea
                className={fb.textarea}
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                placeholder="Ex.: Senti falta de um botão para..., ou tive dúvida na hora de..."
                required
              />
            </label>

            {error ? <p className={fb.error} role="alert">{error}</p> : null}

            <div className={fb.actions}>
              <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={sending}>
                {sending ? "Enviando…" : "Enviar mensagem"}
              </button>
            </div>
          </form>
        )}

        {history.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              className={fb.historyToggle}
              aria-expanded={showHistory}
              onClick={() => setShowHistory(v => !v)}
            >
              <span>Mensagens enviadas ({history.length})</span>
              <span>{showHistory ? "▲" : "▼"}</span>
            </button>

            {showHistory ? (
              <ul className={fb.historyList}>
                {history.slice(0, 12).map(item => {
                  const cat = FEEDBACK_CATEGORIES.find(c => c.id === item.category);
                  return (
                    <li key={item.id} className={fb.historyItem}>
                      <div className={fb.historyMeta}>
                        <span>{cat ? `${cat.emoji} ${cat.label}` : item.category}</span>
                        {item.rating ? <span>· {"★".repeat(item.rating)}</span> : null}
                        {item.senderEmail ? <span>· {item.senderEmail}</span> : null}
                        <span>· {formatDate(item.createdAt)}</span>
                      </div>
                      <p className={fb.historyMsg}>{item.message}</p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
