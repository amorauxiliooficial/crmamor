import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCorsHeaders } from "../_shared/cors.ts";

const GRAPH_API_VERSION = 'v21.0';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_WA_TOKEN = Deno.env.get("META_WA_TOKEN")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { message_id, meta_media_id } = await req.json();

    if (!meta_media_id || !message_id) {
      return new Response(JSON.stringify({ error: 'Missing meta_media_id or message_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📥 Downloading media: ${meta_media_id} for message ${message_id}`);

    // Step 1: Get media URL from Meta
    const mediaInfoRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${meta_media_id}`,
      { headers: { 'Authorization': `Bearer ${META_WA_TOKEN}` } }
    );

    if (!mediaInfoRes.ok) {
      const err = await mediaInfoRes.text();
      console.error(`❌ Meta media info error: ${err}`);
      return new Response(JSON.stringify({ error: 'Failed to get media info from Meta' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mediaInfo = await mediaInfoRes.json();
    const mediaDownloadUrl = mediaInfo.url;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';
    const fileSize = mediaInfo.file_size || null;

    console.log(`📎 Media info: mime=${mimeType}, size=${fileSize}, url=${mediaDownloadUrl?.slice(0, 60)}...`);

    // Step 2: Download the actual file
    const fileRes = await fetch(mediaDownloadUrl, {
      headers: { 'Authorization': `Bearer ${META_WA_TOKEN}` },
    });

    if (!fileRes.ok) {
      console.error(`❌ Failed to download media file: ${fileRes.status}`);
      return new Response(JSON.stringify({ error: 'Failed to download media' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = await fileRes.arrayBuffer();

    // Step 3: Determine file extension from mime
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'video/3gpp': '3gp',
      'audio/ogg; codecs=opus': 'ogg', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/amr': 'amr',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'image/webp': 'webp',
    };
    const ext = extMap[mimeType] || mimeType.split('/')[1] || 'bin';
    const filename = `${message_id}.${ext}`;
    const storagePath = `media/${filename}`;

    // Step 4: Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('wa-media')
      .upload(storagePath, new Uint8Array(fileBuffer), {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`❌ Storage upload error:`, uploadErr);
      return new Response(JSON.stringify({ error: 'Failed to upload to storage' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 5: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('wa-media')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    console.log(`✅ Media uploaded: ${publicUrl}`);

    // Step 6: Update the message record
    const { error: updateErr } = await supabase
      .from('wa_messages')
      .update({
        media_url: publicUrl,
        media_mime: mimeType,
        media_size: fileSize ? Number(fileSize) : null,
        media_filename: filename,
      })
      .eq('id', message_id);

    if (updateErr) {
      console.error(`❌ Message update error:`, updateErr);
    }

    return new Response(JSON.stringify({ success: true, media_url: publicUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Media download error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
