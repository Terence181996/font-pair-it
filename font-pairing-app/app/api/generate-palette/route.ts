import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Check if API key is configured
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('Gemini API key is not configured');
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const { prompt, count = 10 } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Generating palette with prompt:', prompt);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Check if the prompt contains keywords related to digital or print
    const isDigitalOrPrint = /\b(digital|print|website|app|mobile|web|screen|accessibility|wcag)\b/i.test(prompt);

    const baseFormat = `{
      "palettes": [
        {
          "colors": ["#HEXCODE1", "#HEXCODE2", "#HEXCODE3"],
          "name": "Palette Name",
          "reason": "Explanation of why these colors work well together and match the user's needs"
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
    Return ONLY a JSON response in the following format, with no additional text or explanation:
    ${baseFormat}
    
    Important instructions:
    1. Generate exactly ${count} different palettes
    2. Each palette should have 3-5 colors
    3. Give each palette a creative and descriptive name
    4. Colors should work well together and match the user's needs
    ${isDigitalOrPrint ? `5. Ensure colors meet WCAG accessibility guidelines
    6. Calculate actual contrast ratios for the primary text color against the background color` : ''}
    
    The response must be valid JSON.`;

    const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
    
    const response = result.response;
    const text = response.text();
    console.log('Raw API response:', text);
    
    // Extract the JSON part from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from API");
    }
    
    try {
      const parsedResponse = JSON.parse(jsonMatch[0]);
      if (!parsedResponse.palettes || !Array.isArray(parsedResponse.palettes)) {
        throw new Error("Response missing required palette data");
      }
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing API response:', parseError);
      throw new Error("Failed to parse API response");
    }
  } catch (error) {
    console.error('Error in generate-palette route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate color palette' },
      { status: 500 }
    );
  }
} 