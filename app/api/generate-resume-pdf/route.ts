import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { prompt, name } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const hugpdfApiKey = process.env.HUGPDF_API_KEY;

    // Diagnostic logging
    if (hugpdfApiKey) {
      console.log(`HugPDF API key found. Masked: ${hugpdfApiKey.substring(0, 8)}...${hugpdfApiKey.substring(hugpdfApiKey.length - 4)}`);
    } else {
      console.error('HUGPDF_API_KEY is missing from process.env');
    }

    if (!hugpdfApiKey) {
      return NextResponse.json({ error: 'HugPDF API key not configured. Please contact support.' }, { status: 500 });
    }

    const response = await axios.post('https://api.hugpdf.app/api/v1/generate', {
      prompt: prompt,
      mode: request.headers.get('x-hugpdf-mode') || 'normal'
    }, {
      headers: { 'Authorization': `Bearer ${hugpdfApiKey}` },
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout
    });

    // Validate we got actual PDF data
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
      console.error('Unexpected content type from HugPDF:', contentType);
      try {
        const errorText = Buffer.from(response.data).toString('utf-8');
        console.error('HugPDF response body:', errorText);

        // Handle specific error messages in body if provided
        if (errorText.includes('PGRST116')) {
          return NextResponse.json({ error: 'HugPDF service is currently unavailable (Backend Error). Please try again later.' }, { status: 503 });
        }

        return NextResponse.json({ error: 'HugPDF returned an unexpected response. Please try again.' }, { status: 502 });
      } catch {
        return NextResponse.json({ error: 'Failed to generate PDF. Please try again.' }, { status: 502 });
      }
    }

    // Build a clean filename
    const safeName = (name || 'Document').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const filename = `${safeName}.pdf`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    // Relay remaining credits if available
    const credits = response.headers['x-credits-remaining'] || response.headers['x-ratelimit-remaining'];
    if (credits) {
      headers.set('X-Credits-Remaining', credits.toString());
    }

    return new NextResponse(response.data, { headers });

  } catch (error: any) {
    console.error('Error generating PDF:', error?.message || error);

    const getErrorDetail = (data: any) => {
      try {
        const text = Buffer.isBuffer(data)
          ? data.toString('utf-8')
          : data instanceof Uint8Array || data instanceof ArrayBuffer
            ? Buffer.from(new Uint8Array(data)).toString('utf-8')
            : typeof data === 'string' ? data : JSON.stringify(data);

        try {
          const parsed = JSON.parse(text);
          return parsed.detail || parsed.message || parsed.error || text;
        } catch {
          return text;
        }
      } catch {
        return null;
      }
    };

    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Request timed out. The AI is taking too long — please try a simpler prompt.' }, { status: 504 });
    }

    if (error?.response?.status) {
      const status = error.response.status;
      const detail = getErrorDetail(error.response.data);
      console.error(`HugPDF Error (${status}):`, detail);

      if (status === 401) {
        return NextResponse.json({ error: 'Invalid API key. Please contact support.' }, { status: 401 });
      }

      if (status === 402) {
        return NextResponse.json({ error: detail || 'Out of credits on HugPDF. Please contact administrator.' }, { status: 402 });
      }

      if (status === 429) {
        return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
      }

      // Handle the specific database error we've been seeing
      if (detail && detail.includes('PGRST116')) {
        return NextResponse.json({ error: 'HugPDF service is currently unavailable (Upstream Database Error: PGRST116). Please try again later.' }, { status: 503 });
      }

      return NextResponse.json(
        { error: detail || `HugPDF API error (${status}). Please try again.` },
        { status: status }
      );
    }

    return NextResponse.json({ error: 'Failed to generate PDF. Please try again.' }, { status: 500 });
  }
}
