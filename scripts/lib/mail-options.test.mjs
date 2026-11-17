import { test } from "node:test";
import assert from "node:assert/strict";
import { mailOptions } from "./mail-options.mjs";

test("mailOptions sends to one recipient with no BCC and preserves the sender", () => {
  const message = {
    subject: "Subject",
    text: "Plain text",
    html: "<p>HTML</p>",
  };

  const options = mailOptions({
    from: "sender@example.com",
    recipient: "friend@example.com",
    message,
  });

  assert.deepEqual(options, {
    from: "sender@example.com",
    to: "friend@example.com",
    subject: "Subject",
    text: "Plain text",
    html: "<p>HTML</p>",
  });
  assert.equal(Object.hasOwn(options, "bcc"), false);
});

test("mailOptions rejects recipient values that may contain multiple addresses", () => {
  assert.throws(
    () =>
      mailOptions({
        from: "sender@example.com",
        recipient: "one@example.com; two@example.com",
        message: { subject: "", text: "", html: "" },
      }),
    /exactly one email address/,
  );
});
