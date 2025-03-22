import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export interface ColorPalette {
  colors: string[];
  reason: string;
  accessibility: {
    wcag2: {
      normal: number;
      large: number;
    };
  };
}

export async function generateColorPalette(prompt: string): Promise<ColorPalette[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemPrompt = `You are a color palette generation expert. Generate color palettes based on the user's description.
    Return ONLY a JSON response in the following format, with no additional text or explanation:
    {
      "palettes": [
        {
          "colors": ["#HEXCODE1", "#HEXCODE2", "#HEXCODE3"],
          "reason": "Explanation of why these colors work well together and match the user's needs",
          "accessibility": {
            "wcag2": {
              "normal": 4.5,
              "large": 3.1
            }
          }
        }
      ]
    }
    Generate 3 different palettes. Each palette should have 3-5 colors.
    Ensure colors work well together and meet WCAG accessibility guidelines.
    Calculate actual contrast ratios for the primary text color against the background color.
    The response must be valid JSON.`;

    const result = await model.generateContent([
      systemPrompt,
      prompt
    ]);
    const response = result.response;
    const text = response.text();
    
    // Extract the JSON part from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    return parsedResponse.palettes;
  } catch (error) {
    console.error('Error generating color palette:', error);
    throw error;
  }
} 