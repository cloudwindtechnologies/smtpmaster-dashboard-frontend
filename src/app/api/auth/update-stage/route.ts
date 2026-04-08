import { apiURL } from "@/components/app_component/common/http";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('Token being sent:', token ? 'Present' : 'MISSING');

    const backendRes = await fetch(`${apiURL}/api/v1/updateStage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Get raw response first
    const rawText = await backendRes.text();
    console.log('Raw response:', rawText.substring(0, 500));
    console.log('Status:', backendRes.status);
    console.log('Content-Type:', backendRes.headers.get('content-type'));

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return NextResponse.json({
        code: 500,
        message: 'Backend returned HTML instead of JSON',
        status: backendRes.status,
        preview: rawText.substring(0, 200)
      }, { status: 500 });
    }

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { code: 500, message: 'Request failed' },
      { status: 500 }
    );
  }
}