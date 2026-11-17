import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completeCard,
  loadState,
  recipientId,
  recordAttempt,
} from "./notification-state.mjs";

const SECRET = "test-app-password";

test("recipientId normalizes addresses and is stable for a secret", () => {
  assert.equal(
    recipientId(" Friend@Example.com ", SECRET),
    recipientId("friend@example.com", SECRET),
  );
  assert.notEqual(
    recipientId("friend@example.com", SECRET),
    recipientId("other@example.com", SECRET),
  );
  assert.notEqual(
    recipientId("friend@example.com", SECRET),
    recipientId("friend@example.com", "other-secret"),
  );
});

test("loadState migrates legacy card IDs as completed", () => {
  const state = loadState(JSON.stringify(["card-1"]), SECRET);

  assert.deepEqual(state.completed, ["card-1"]);
  assert.deepEqual(state.attempts, {});
  assert.equal(typeof state.keyId, "string");
  assert.doesNotMatch(JSON.stringify(state), /test-app-password/);
});

test("recordAttempt keeps each recipient attempt only once", () => {
  const id = recipientId("friend@example.com", SECRET);
  const state = loadState("[]", SECRET);

  assert.deepEqual(
    recordAttempt(recordAttempt(state, "card-1", id), "card-1", id)
      .attempts["card-1"],
    [id],
  );
});

test("completeCard records completion and removes partial attempts", () => {
  const id = recipientId("friend@example.com", SECRET);
  const state = completeCard(
    recordAttempt(loadState("[]", SECRET), "card-1", id),
    "card-1",
  );

  assert.deepEqual(state.completed, ["card-1"]);
  assert.equal(Object.hasOwn(state.attempts, "card-1"), false);
});

test("serialized state never contains recipient email addresses", () => {
  const email = "friend@example.com";
  const id = recipientId(email, SECRET);
  const state = recordAttempt(loadState("[]", SECRET), "card-1", id);

  assert.doesNotMatch(JSON.stringify(state), new RegExp(email));
  assert.ok(JSON.stringify(state).includes(id));
});

test("loadState fails closed on key rotation with partial attempts", () => {
  const id = recipientId("friend@example.com", SECRET);
  const partial = recordAttempt(loadState("[]", SECRET), "card-1", id);

  assert.throws(
    () => loadState(JSON.stringify(partial), "rotated-app-password"),
    /changed while recipient attempts are pending/,
  );
});

test("loadState accepts a key change when there are no partial attempts", () => {
  const state = loadState("[]", SECRET);
  const rotated = loadState(
    JSON.stringify(completeCard(state, "card-1")),
    "rotated-app-password",
  );

  assert.deepEqual(rotated.completed, ["card-1"]);
  assert.deepEqual(rotated.attempts, {});
  assert.notEqual(rotated.keyId, state.keyId);
});

test("loadState rejects completed IDs that are not strings", () => {
  assert.throws(
    () =>
      loadState(
        JSON.stringify({ completed: [1], keyId: "key", attempts: {} }),
        SECRET,
      ),
    /Invalid notified state format/,
  );
});
