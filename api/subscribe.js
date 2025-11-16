// api/subscribe.js
// Vercel serverless function to send subscribers + preferences to Beehiiv

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, firstName, filters, highSalaryOnly } = req.body || {};

  if (!email || !firstName) {
    return res.status(400).json({ error: "Missing first name or email." });
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    return res
      .status(500)
      .json({ error: "Beehiiv is not configured on the server." });
  }

  // Map filters to Beehiiv custom fields (must match keys you created in Beehiiv)
  const safeFilters = filters || {};
  const customFields = {
    first_name: firstName,
    location_preferences: (safeFilters.locations || []).join(", "),
    employment_preferences: (safeFilters.employment || []).join(", "),
    experience_levels: (safeFilters.experience || []).join(", "),
    job_categories: (safeFilters.jobCategories || []).join(", "),
    benefits: (safeFilters.benefits || []).join(", "),
    technologies: (safeFilters.technologies || []).join(", "),
    languages: (safeFilters.languages || []).join(", "),
    high_salary_only: highSalaryOnly ? "true" : "false"
  };

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscribers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "asap_jobs_landing",
          custom_fields: customFields
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Beehiiv error:", response.status, data);
      const message =
        data && data.error
          ? data.error
          : "Failed to subscribe via Beehiiv. Please try again later.";
      return res.status(500).json({ error: message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Subscribe handler error:", err);
    return res
      .status(500)
      .json({ error: "Unexpected error while subscribing." });
  }
}
