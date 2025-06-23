export default async function handler(req, res) {
  const brand = req.query.brand || "";
  const YT_API = "AIzaSyDolaptFNsBtRrq4RG2f8Ic-YRFn4IW8ns";
  const OPENAI_API = "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";

  if (!brand) return res.status(400).json({ result: "Missing brand name" });

  try {
    // Get video IDs
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(brand)}&key=${YT_API}`
    );
    const ytData = await ytRes.json();
    const videoIds = ytData.items.map(item => item.id.videoId).join(",");

    if (!videoIds) {
      return res.status(404).json({ result: "No videos found." });
    }

    // Get video descriptions
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

    // Send to OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });

    const aiData = await aiRes.json();

    // Log the full response to Vercel logs
    console.log("🔍 OpenAI raw response:", JSON.stringify(aiData, null, 2));

    if (!aiData || !aiData.choices || !aiData.choices[0]?.message?.content) {
      return res.status(500).json({ result: "AI failed to respond or format was invalid." });
    }

    const reply = aiData.choices[0].message.content;
    res.status(200).json({ result: reply });

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ result: "Server error. Check logs or API limits." });
  }
}
