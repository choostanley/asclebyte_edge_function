// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Members!")

serve(async (req: Request) => {
  try {
    const {
      deptUid,
      createdById,
      createdForId,
      createdForName,
      createdForMmcLjm,
      createdAt,
      encKey,
      backKey,
      identifier
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

    // need to check if createdById is auther first
    // upload and try out later
    const { data, error } = await supabaseClient.from('dept_authers').select('*').match({ dept_id: deptUid, user_id: createdById, active: true })
    if (error) throw error
    if (data.length === 0) {
      return new Response(JSON.stringify({ user, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    } else {
      // this change to member
      // const { data, error } = await supabaseClient.from('dept_user_key').select('*').match({ dept_id: deptUid, user_id: createdForId, active: true })
      const { data, error } = await supabaseClient.from('dept_members').select('*').match({ dept_id: deptUid, user_id: createdForId, active: true })
      if (error) throw error

      if (data.length === 1) { // already member
        return new Response(JSON.stringify({ user, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 300,
        });
      }


      if (data.length === 0) {
        const { data, error } = await supabaseClient
          .from('dept_members')
          .insert({
            created_at: createdAt,
            dept_id: deptUid,
            user_id: createdForId,
            user_name: createdForName,
            user_mmcljm: createdForMmcLjm,
            created_by_id: createdById,
            active: true
          })
          .select();

        if (error) throw error

        if (data.length === 1) { // forgot to verify users_acc leh - do it here
          const { data, error } = await supabaseClient
            .from('users_acc')
            .update({
              verified: true,
              verified_at: Date().toISOString(),
              verified_by_user: createdById,
              verified_by_dept: deptUid
            })
            .match({ id: createdForId, verified: false });
          if (error) throw error
        }

        if (data.length === 1) {
          const { data, error } = await supabaseClient
            .from('dept_user_key')
            .insert({
              created_at: createdAt,
              user_id: createdForId,
              enc_key: encKey,
              created_by_id: createdById,
              back_key: backKey,
              dept_id: deptUid,
              active: true,
              identifier: identifier
            })
            .select();

          if (error) throw error
          return new Response(JSON.stringify({ user, data }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          const { error } = await supabase.from('dept_members').delete().match({
            dept_id: deptUid,
            user_id: createdForId,
            created_by_id: createdById,
            active: true
          })
          if (error) throw error
          return new Response(JSON.stringify({ error: 'Unable to create Member' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          })
        }

      }
    }



    return new Response(JSON.stringify({ user, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
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
