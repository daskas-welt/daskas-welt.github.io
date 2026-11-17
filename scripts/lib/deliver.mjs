// Decides what a run does: seed an empty state, email what is new, record what
// was handled. Kept free of IO so the failure-prone rules are testable.

import { buildMessage, handled, nextState, pending } from "./messages.mjs";

// `state` is the ids already handled, `sha` the state file's blob sha (null
// when it does not exist yet). Without a state file the page's current ids are
// adopted instead of mailing the whole back catalogue.
export async function deliver({ cards, state, sha, send, write }) {
  if (!sha) {
    const ids = nextState([], cards);
    await write(ids);
    return { bootstrapped: ids.length, sent: [], failed: null };
  }

  const sent = [];
  let failed = null;

  for (const card of pending(cards, state)) {
    try {
      await send(buildMessage(card));
      sent.push(card.id);
    } catch (error) {
      failed = card.id;
      break;
    }
  }

  const ids = nextState(state, handled(cards, sent));
  if (ids.length !== state.length) await write(ids);

  return { bootstrapped: null, sent, failed };
}
