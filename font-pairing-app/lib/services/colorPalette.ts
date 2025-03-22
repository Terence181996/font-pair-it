import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function generateColorPalette(prompt: string, count: number = 10) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const isDigitalOrPrint = /\b(digital|print|website|app|mobile|web|screen|accessibility|wcag)\b/i.test(prompt);

  const baseFormat = `{
    "palettes": [
      {
        "colors": ["#HEXCODE1", "#HEXCODE2", "#HEXCODE3"],
        "name": "Palette Name",
        "reason": "Explanation of why these colors work well together"
        ${isDigitalOrPrint ? `,
        "accessibility": {
          "wcag2": {
            "normal": 4.5,
            "large": 3.1
          }
        }` : ''}
      }
    ]
  }`;

  const systemPrompt = `You are a color palette generation expert. Generate color palettes based on the user's description.
  Return ONLY a JSON response in this format: ${baseFormat}
  
  Instructions:
  1. Generate ${count} different palettes
  2. Each palette should have 3-5 colors
  3. Give each palette a creative name
  4. Colors should work well together
  ${isDigitalOrPrint ? '5. Ensure colors meet WCAG guidelines' : ''}`;

  const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) throw new Error("Invalid response format");
  
  const parsedResponse = JSON.parse(jsonMatch[0]);
  if (!parsedResponse.palettes?.length) throw new Error("No palettes generated");
  
  return parsedResponse.palettes;
} 