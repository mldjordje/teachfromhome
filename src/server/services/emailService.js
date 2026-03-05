const brevoApiKey = process.env.BREVO_API_KEY || "";
const fromEmailRaw = process.env.FROM_EMAIL || "";
const senderEmail = process.env.BREVO_SENDER_EMAIL || "";
const senderName = process.env.BREVO_SENDER_NAME || "";

const parseFromEmail = (raw) => {
  const input = String(raw || "").trim();
  if (!input) return { email: "", name: "" };

  const match = input.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  }

  return { email: input, name: "" };
};

const fallbackFrom = parseFromEmail(fromEmailRaw);

const resolveSender = () => {
  const email = senderEmail || fallbackFrom.email;
  const name = senderName || fallbackFrom.name || "TeachFromHome";
  return { email, name };
};

export const sendEmail = async ({ to, subject, text }) => {
  const recipient = String(to || "").trim();
  if (!brevoApiKey || !recipient) {
    return;
  }

  const sender = resolveSender();
  if (!sender.email) {
    return;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: recipient }],
        subject: String(subject || "").trim(),
        textContent: String(text || ""),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${response.status} ${details}`);
    }
  } catch (error) {
    console.warn("sendEmail skipped/fail", error?.message || error);
  }
};
