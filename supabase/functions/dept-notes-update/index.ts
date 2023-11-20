// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Dept Process!")

serve(async (req: Request) => {
  try {
    const {
      deptUid,
      createdById,
      createdAt,
      notes
    } = await req.json();

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Now we can get the session or user object
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    const { data, error } = await supabaseClient.from('depts').select('notes_history').match({ id: deptUid })
    if (error) throw error

    let notesArray: any[] = data;
    if (data.length === 1) {
      let notesHis: any[] = notesArray[0]['notes_history'];
      notesHis.push({
        'created_at': createdAt,
        'created_by': createdById,
        'notes': notes
      });
      const { data, error } = await supabaseClient
        .from('depts')
        .update({
          'notes': notes,
          'notes_history': notesHis
        })
        .eq('id', deptUid)
        .select();
      if (error) throw error
      return new Response(JSON.stringify({ user, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // start edit here

    //////

    // return new Response(JSON.stringify({ user, data }), {
    //   headers: { 'Content-Type': 'application/json' },
    //   status: 200,
    // })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
