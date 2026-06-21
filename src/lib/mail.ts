export async function sendResetPasswordEmail(email: string, resetLink: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.log("\n==================================================================");
    console.log(`🔑 [DEV MODE] PASSWORD RESET LINK REQUESTED FOR: ${email}`);
    console.log(`🔗 Link: ${resetLink}`);
    console.log("==================================================================\n");
    return { ok: true }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Road to IT Olympics <onboarding@resend.dev>", // Default sandbox email for unverified Resend domains
        to: email,
        subject: "Reset your Password — Road to IT Olympics",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #10b981; margin-bottom: 20px;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your Road to IT Olympics training account.</p>
            <p style="margin: 25px 0;">
              <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="font-size: 13px; color: #6b7280; margin-top: 25px;">
              This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af;">
              If the button above does not work, copy and paste this URL into your browser: <br />
              <a href="${resetLink}" style="color: #10b981;">${resetLink}</a>
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("[Mail Error] Resend API responded with status:", response.status, errText)
      return { ok: false, error: `Resend API Error: ${errText}` }
    }

    return { ok: true }
  } catch (error: any) {
    console.error("[Mail Error] Failed to send email via Resend:", error)
    return { ok: false, error: error.message || "Unknown error occurred" }
  }
}
