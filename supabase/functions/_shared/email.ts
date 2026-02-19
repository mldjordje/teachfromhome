import { HttpError } from "./http.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL");

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!resendApiKey || !fromEmail) {
    console.warn("Email skipped: RESEND_API_KEY or FROM_EMAIL is not configured");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new HttpError(502, "Failed to send email", err);
  }
}
