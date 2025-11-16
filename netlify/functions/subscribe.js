// netlify/functions/subscribe.js

// Make sure these are set in Netlify -> Site settings -> Environment variables
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error("Missing Beehiiv environment variables");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { email, firstName, preferences = {} } = body;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    const payload = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: "asap-jobs-landing",
      custom_fields: {
        first_name: firstName || "",
        high_salary_only: preferences.highSalaryOnly ? "true" : "false",
        active_filters: preferences.activeFilters || "",
        location: preferences.location || "",
        employment_type: preferences.employment || "",
        experience_level: preferences.experience || "",
        job_category: preferences.jobCategory || "",
        benefits: preferences.benefits || "",
        technologies: preferences.technologies || "",
        languages: preferences.languages || "",
      },
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
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Beehiiv API error",
          detail: text,
        }),
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (err) {
    console.error("Subscribe function error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
