// /api/subscribe.js

// Make sure these are set in Vercel → Project Settings → Environment Variables
// BEEHIIV_API_KEY
// BEEHIIV_PUBLICATION_ID

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

    // Frontend payload shape:
    // {
    //   email,
    //   firstName,
    //   filters: {
    //     locations, employment, experience, jobCategories,
    //     benefits, technologies, languages
    //   },
    //   highSalaryOnly,
    //   searchTerm?   // optional
    // }

    const {
      email,
      firstName,
      filters = {},
      highSalaryOnly = false,
      searchTerm = "",
    } = body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const {
      locations = [],
      employment = [],
      experience = [],
      jobCategories = [],
      benefits = [],
      technologies = [],
      languages = [],
    } = filters || {};

    const join = (val) =>
      Array.isArray(val) && val.length ? val.join(" | ") : "";

    // 1) Build a simple key → value map for your custom fields
    // These names MUST exactly match the custom field names in Beehiiv
    const customFieldMap = {
      first_name: firstName || "", // <-- make sure you created this field in Beehiiv
      high_salary_only: highSalaryOnly ? "true" : "false",
      active_filters: Object.keys(filters)
        .filter((k) => Array.isArray(filters[k]) && filters[k].length)
        .join(","),

      location_pref: join(locations),
      employment_type: join(employment),
      experience_level: join(experience),
      job_category: join(jobCategories),

      benefits_pref: join(benefits),
      technologies_pref: join(technologies),
      languages_pref: join(languages),

      search_term: searchTerm || "",
    };

    // 2) Clean the map into Beehiiv's expected OBJECT shape (not an array)
    const customFields = Object.fromEntries(
      Object.entries(customFieldMap)
        .map(([name, value]) => [name, value == null ? "" : String(value).trim()])
        .filter(([, value]) => value !== "")
    );

    const payload = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: "asap-jobs-landing",
      custom_fields: customFields,
    };

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
        error: "Failed to subscribe via Beehiiv. Please try again later.",
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
