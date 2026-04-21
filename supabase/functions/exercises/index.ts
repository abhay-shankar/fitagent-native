import { corsHeaders } from '../_shared/cors.ts';

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') ?? '';
const RAPIDAPI_HEADERS = {
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
};

async function getExerciseId(exerciseName: string): Promise<string | null> {
  const query = encodeURIComponent(exerciseName.toLowerCase());
  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises/name/${query}?limit=1`,
    { headers: RAPIDAPI_HEADERS },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0]?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const name = url.searchParams.get('name');

    if (action !== 'image' || !name) {
      return new Response(JSON.stringify({ error: 'action=image and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exerciseId = await getExerciseId(name);
    if (!exerciseId) {
      return new Response(JSON.stringify({ error: 'Exercise not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageUrl = `https://exercisedb.p.rapidapi.com/image?resolution=1080&exerciseId=${exerciseId}`;
    const imageRes = await fetch(imageUrl, { headers: RAPIDAPI_HEADERS });

    if (!imageRes.ok) {
      return new Response(JSON.stringify({ error: 'Image fetch failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageBytes = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('Content-Type') ?? 'image/gif';

    return new Response(imageBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[exercises function]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
