// Decides what a run does: seed an empty state, email what is new, record what
// was handled. Kept free of IO so the failure-prone rules are testable.

import { completeCard, recordAttempt } from "./notification-state.mjs";
import { buildMessage, nextState, pending } from "./messages.mjs";

// `state` tracks completed cards and attempted recipients. Without a state
// file, the current page is adopted instead of mailing the back catalogue.
export async function deliver({ cards, state, sha, recipients, send, write }) {
  let currentState = state;
  let currentSha = sha;
  const persist = async (next) => {
    currentSha = await write(next, currentSha);
    currentState = next;
  };

  if (!currentSha) {
    currentState = {
      ...currentState,
      completed: nextState([], cards),
      attempts: {},
    };
    await persist(currentState);
    return {
      bootstrapped: currentState.completed.length,
      sent: [],
      failed: null,
      state: currentState,
      sha: currentSha,
    };
  }

  for (const card of cards) {
    if (
      card.notify === false &&
      card.id &&
      !currentState.completed.includes(card.id)
    ) {
      currentState = completeCard(currentState, card.id);
    }
  }
  if (currentState !== state) await persist(currentState);

  const toSend = pending(cards, currentState.completed);
  if (toSend.length && recipients.length === 0) {
    throw new Error("No recipients configured");
  }

  const sent = [];
  let failed = null;

  for (const card of toSend) {
    let cardFailed = false;
    let sendSucceeded = false;

    for (const recipient of recipients) {
      if (currentState.attempts[card.id]?.includes(recipient.id)) continue;

      await persist(recordAttempt(currentState, card.id, recipient.id));
      try {
        await send(buildMessage(card), recipient, card.id);
        sendSucceeded = true;
      } catch {
        cardFailed = true;
        failed ??= card.id;
      }
    }

    await persist(completeCard(currentState, card.id));
    if (sendSucceeded && !cardFailed) sent.push(card.id);
    if (cardFailed) break;
  }

  return {
    bootstrapped: null,
    sent,
    failed,
    state: currentState,
    sha: currentSha,
  };
}
