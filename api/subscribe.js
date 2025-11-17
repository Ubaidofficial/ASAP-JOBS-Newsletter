// /api/subscribe.js

// Env vars needed (set in Vercel / hosting):
// - BEEHIIV_API_KEY
// - BEEHIIV_PUBLICATION_ID   (looks like: pub_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error("Missing Beehiiv env vars");
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    // Frontend payload:
    // {
    //   email,
    //   firstName,
    //   filters: { locations, employment, experience, jobRoles, benefits, technologies, languages },
    //   highSalaryOnly,
    //   frequency,   // "2x", "daily", "weekly"
    //   searchTerm?  // optional
    // }

    const {
      email,
      firstName,
      filters = {},
      highSalaryOnly = false,
      frequency = "",
      searchTerm = "",
    } = body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const {
      locations = [],
      employment = [],
      experience = [],
      jobRoles = [],
      benefits = [],
      technologies = [],
      languages = [],
    } = filters || {};

    const join = (val) =>
      Array.isArray(val) && val.length ? val.join(" | ") : "";

    // Map of Beehiiv custom fields (names MUST match Beehiiv exactly)
    const customFieldMap = {
      first_name: firstName || "",
      high_salary_only: highSalaryOnly ? "true" : "false",

      active_filters: Object.keys(filters)
        .filter((k) => Array.isArray(filters[k]) && filters[k].length)
        .join(","),

      location_pref: join(locations),
      employment_type: join(employment),
      experience_level: join(experience),

      // New fields (create as TEXT in Beehiiv)
      job_roles: join(jobRoles),
      frequency: frequency || "",

      benefits_pref: join(benefits),
      technologies_pref: join(technologies),
      languages_pref: join(languages),

      // optional, handy for debugging / segmentation
      search_term: searchTerm || "",
    };

    // Convert to Beehiiv's expected array: [{ name, value }, ...]
    const customFieldsArray = Object.entries(customFieldMap)
      .filter(([, value]) => value && String(value).trim() !== "")
      .map(([name, value]) => ({
        name,
        value: String(value),
      }));

    const payload = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: "asap-jobs-landing",
      custom_fields: customFieldsArray,
    };

    // IMPORTANT: correct Beehiiv endpoint
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error("Beehiiv error:", response.status, text);
      return res.status(response.status).json({
        error: "Failed to subscribe in Beehiiv",
        detail: text,
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Subscribe API error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
