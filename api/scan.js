export default async function handler(req, res) {
  const brand = req.query.brand || "";
  const YT_API = "AIzaSyDolaptFNsBtRrq4RG2f8Ic-YRFn4IW8ns";
  const OPENAI_API = "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";

  if (!brand) return res.status(400).json({ result: "Missing brand name" });

  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q=${encodeURIComponent(brand)}&key=${YT_API}`
    );
    const ytData = await ytRes.json();
    const videoIds = ytData.items.map(item => item.id.videoId).join(",");

    if (!videoIds) {
      return res.status(404).json({ result: "No videos found." });
    }

    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${YT_API}`
    );
    const detailData = await detailRes.json();
    const descriptions = detailData.items.map(v => v.snippet.description).join("\n---\n");

    const prompt = `
These are YouTube video descriptions about "${brand}". Extract any promo codes, sponsor URLs, or brand offers. Show them cleanly like:

CODE: XYZ20 — 20% off at BrandName
URL: example.com/techdeal

Descriptions:
${descriptions}
    `.trim();

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    const aiData = await aiRes.json();

    // Send back entire AI response as JSON for debugging
    return res.status(200).json(aiData);

  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown server error." });
  }
}

