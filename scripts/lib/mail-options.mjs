export function validateRecipient(recipient) {
  if (
    typeof recipient !== "string" ||
    !recipient ||
    recipient.trim() !== recipient ||
    /[\s,;<>]/.test(recipient) ||
    (recipient.match(/@/g) ?? []).length !== 1
  ) {
    throw new Error("Recipient must be exactly one email address");
  }
}

export function mailOptions({ from, recipient, message }) {
  validateRecipient(recipient);
  return {
    from,
    to: recipient,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
}
