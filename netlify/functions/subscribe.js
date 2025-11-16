// netlify/functions/subscribe.js

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
    const { email, firstName, preferences } = JSON.parse(event.body || "{}");

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
        search_term: preferences?.searchTerm || "",
        high_salary_only: preferences?.highSalaryOnly ? "true" : "false",
        active_filters: preferences?.activeFilters || "",
        location: preferences?.location || "",
        employment_type: preferences?.employmentType || "",
        experience_level: preferences?.experienceLevel || "",
        job_category: preferences?.jobCategory || "",
        benefits: preferences?.benefits || "",
        technologies: preferences?.technologies || "",
        languages: preferences?.languages || "",
      },
    };

    const resp = await fetch(
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

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Beehiiv error:", text);
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: "Beehiiv API error", detail: text }),
      };
    }

    const data = await resp.json();
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
