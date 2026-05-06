export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return new Response("Invalid filename", { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  try {
    const upstream = await fetch(`${apiUrl}/uploads/${name}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    if (!upstream.ok) {
      return new Response("File not found", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Failed to fetch file", { status: 502 });
  }
}
