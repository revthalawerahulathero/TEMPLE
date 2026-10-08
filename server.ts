import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// 1. API: Smart Dhamma AI Assistant endpoint
app.post("/api/gemini-consult", async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemInstruction = `
You are the "Smart Dhamma AI Assistant" (ස්මාර්ට් ශාසන උපදේශක), a virtual monk and spiritual advisor for the historic "Uttara Saliya Sri Dalada Rajamaha Viharaya" (උත්තර සාලිය ශ්‍රී දළදා රජමහා විහාරය) in Saliyapura, Anuradhapura.

Here are the absolute facts about the temple you MUST use:
- Name: Uttara Saliya Sri Dalada Rajamaha Viharaya (උත්තර සාලිය ශ්‍රී දළදා රජමහා විහාරය)
- Location: Saliyapura, Anuradhapura (Near the Medical Faculty of Rajarata University / සාලියපුර වෛද්‍ය පීඨය අසල).
- Founding: Founded in 1962 under the pioneering leadership and noble guidance of the late Ven. Dutudamuwewe Dhammaloka Nahimi (පූජ්‍ය දුටුදැමුවැවේ ධම්මාලෝක නාහිමිපාණන් වහන්සේ).
- Chief Incumbent: Ven. Wilachchiye Saddhananda Himi (පූජ්‍ය විලච්චියේ සද්ධා නන්ද ස්වාමීන් වහන්සේ). Contact: 071 834 4050, Email: sithuvilidehena207@gmail.com.
- Features: Beautiful golden railings surrounding the sacred Bo tree, a pristine whitewashed historic Stupa, a beautifully painted historic shrine room (image house) containing colorful and serene Buddha statues, a preaching hall (Dhamma Hall), and a Dhamma school for children.

Your guidelines:
- Always be extremely respectful, polite, and peaceful, embodying a wise Buddhist monk's tone.
- Respond in the language of the user (primarily Sinhala or English).
- If asked about Buddhist teachings (Dhamma), offer wise, encouraging, and clear guidance.
- Keep your answers concise, structured, and easy to read. Do not hallucinate other contact details or locations.
`;

    // Construct contents from history
    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((turn: any) => {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "සමාවන්න, මට මේ අවස්ථාවේ ප්‍රතිචාර දැක්වීමට අපහසුයි. තෙරුවන් සරණයි.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Error in gemini-consult:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// 2. API: Dynamic Sponsorship & Blessing Generator endpoint
app.post("/api/generate-brief", async (req, res) => {
  try {
    const { devoteeName, sponsorshipType, amount, dedicationMessage } = req.body;
    if (!devoteeName) {
      return res.status(400).json({ error: "Devotee name is required" });
    }

    const prompt = `
Generate a beautiful, traditional Buddhist Blessing Scroll (පුණ්‍ය අනුමෝදනා පත්‍රිකාව) for a devotee who has pledged a sponsorship.

Devotee Name: ${devoteeName}
Sponsorship Project: ${sponsorshipType}
Amount Pledged: LKR ${amount || "Not Specified"}
Devotee's Prayer/Dedication: ${dedicationMessage || "සියලු දෙනාට නිරෝගී සුවය ලැබේවා!"}

Please write the blessing text in highly formal, traditional, and extremely beautiful literary Sinhala. Frame the scroll as being offered on behalf of the "Uttara Saliya Sri Dalada Rajamaha Viharaya, Saliyapura, Anuradhapura" under the patronage of Chief Incumbent Ven. Wilachchiye Saddhananda Himi.

Return your response in JSON format matching this schema:
{
  "title": "A respectful title in Sinhala (e.g., 'පුණ්‍ය අනුමෝදනා පත්‍රිකාව')",
  "sponsorshipLevel": "A noble traditional designation in Sinhala (e.g., 'විහාර දායකත්ව ප්‍රදීප', 'ශාසනාලෝක මහා දායක')",
  "blessingText": "The full beautifully written paragraph in traditional Sinhala blessing the devotee and their family, transferring merits, and wishing them the ultimate peace of Nibbana.",
  "gatha": "A traditional blessing Pali gatha with a one-line Sinhala translation (e.g. 'සබ්බ දානං ධම්ම දානං ජිනාති...')"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sponsorshipLevel: { type: Type.STRING },
            blessingText: { type: Type.STRING },
            gatha: { type: Type.STRING },
          },
          required: ["title", "sponsorshipLevel", "blessingText", "gatha"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in generate-brief:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// Serve static assets and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
