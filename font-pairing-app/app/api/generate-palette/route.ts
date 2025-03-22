import { NextResponse } from 'next/server';
import { generateColorPalette } from '@/lib/services/colorPalette';

export async function POST(request: Request) {
  try {
    const { prompt, count = 10 } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const palettes = await generateColorPalette(prompt, count);
    return NextResponse.json({ palettes });
  } catch (error) {
    console.error('Error in generate-palette route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate color palette' },
      { status: 500 }
    );
  }
} 