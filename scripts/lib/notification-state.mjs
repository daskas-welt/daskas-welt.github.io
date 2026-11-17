import { createHash } from "node:crypto";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireSecret(secret) {
  if (typeof secret !== "string" || !secret) {
    throw new Error("GMAIL_APP_PASSWORD is required for notification state");
  }
}

function keyId(secret) {
  return hash(`${secret}:notified-state-key`);
}

export function recipientId(address, secret) {
  requireSecret(secret);
  if (typeof address !== "string" || !address.trim()) {
    throw new Error("Recipient address must not be empty");
  }
  return hash(`${secret}:${address.trim().toLowerCase()}`);
}

export function loadState(rawJson, secret) {
  requireSecret(secret);
  const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
  const currentKeyId = keyId(secret);

  if (parsed === null || parsed === undefined) {
    return { completed: [], keyId: currentKeyId, attempts: {} };
  }

  if (Array.isArray(parsed)) {
    return {
      completed: [...new Set(parsed)],
      keyId: currentKeyId,
      attempts: {},
    };
  }

  if (
    typeof parsed !== "object" ||
    !Array.isArray(parsed.completed) ||
    parsed.completed.some((id) => typeof id !== "string") ||
    !parsed.attempts ||
    typeof parsed.attempts !== "object" ||
    Array.isArray(parsed.attempts)
  ) {
    throw new Error("Invalid notified state format");
  }

  const attempts = {};
  for (const [cardId, ids] of Object.entries(parsed.attempts)) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      throw new Error(`Invalid recipient attempts for card ${cardId}`);
    }
    attempts[cardId] = [...new Set(ids)];
  }

  const hasPartialAttempts = Object.keys(attempts).length > 0;
  if (hasPartialAttempts && parsed.keyId !== currentKeyId) {
    throw new Error(
      "GMAIL_APP_PASSWORD changed while recipient attempts are pending",
    );
  }

  return {
    completed: [...new Set(parsed.completed)],
    keyId: currentKeyId,
    attempts,
  };
}

export function recordAttempt(state, cardId, id) {
  if (state.completed.includes(cardId)) return state;
  const attempts = state.attempts[cardId] ?? [];
  if (attempts.includes(id)) return state;

  return {
    ...state,
    attempts: {
      ...state.attempts,
      [cardId]: [...attempts, id],
    },
  };
}

export function completeCard(state, cardId) {
  const attempts = { ...state.attempts };
  delete attempts[cardId];

  return {
    ...state,
    completed: [...new Set([...state.completed, cardId])].sort(),
    attempts,
  };
}
