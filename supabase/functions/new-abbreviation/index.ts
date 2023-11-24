// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Abbrev!")

serve(async (req: Request) => {
  try {
    const {
      short,
      long,
      deptId,
      deptName,
      drug,
      forstt,
      createdById,
      createdAt,
      public,
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

    const { data, error } = await supabaseClient.from('abbreviations').select('info_history').match({ id: deptId, short: short, drug: drug })
    if (error) throw error

    let infoArray: any[] = data;
    if (data.length === 1) {
      let infoHis: any[] = infoArray[0]['info_history'];
      infoHis.push({
        'long': long,
        'forstt': forstt,
        'created_by_id': createdById,
        'created_at': createdAt,
        'dept_name': deptName,
        'public': public
        // drug no need ba since wont change
      }); // next time need to add from deptId and deptName
      const { data, error } = await supabaseClient
        .from('abbreviations')
        .update({
          long: long,
          // dept_id: deptId,
          // drug: drug,
          dept_name: deptName,
          forstt: forstt,
          created_by_id: createdById,
          created_at: createdAt,
          updated_at: createdAt,
          public: public,
          info_history: infoHis
        })
        .match({ id: deptId, short: short, drug: drug })
        .select();
      if (error) throw error
      return new Response(JSON.stringify({ user, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (data.length === 0) {
      infoHis.push(); // next time need to add from deptId and deptName
      const { data, error } = await supabaseClient
        .from('abbreviations')
        .insert({
          short: short,
          long: long,
          dept_id: deptId,
          drug: drug,
          dept_name: deptName,
          forstt: forstt,
          created_by_id: createdById,
          created_at: createdAt,
          updated_at: createdAt,
          public: public,
          info_history: [{
            'long': long,
            'forstt': forstt,
            'created_by_id': createdById,
            'created_at': createdAt,
            'dept_name': deptName,
            'public': public
            // drug no need ba since wont change
          }]
        })
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


// serve(async (req: Request) => {
//   try {
//     const {
//       deptUid,
//       createdById,
//       createdFor,
//       createdAt,
//       encKey,
//       backKey,
//     } = await req.json();

//     // Create a Supabase client with the Auth context of the logged in user.
//     const supabaseClient = createClient(
//       // Supabase API URL - env var exported by default.
//       Deno.env.get('SUPABASE_URL') ?? '',
//       // Supabase API ANON KEY - env var exported by default.
//       Deno.env.get('SUPABASE_ANON_KEY') ?? '',
//       // Create client with Auth context of the user that called the function.
//       // This way your row-level-security (RLS) policies are applied.
//       { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
//     )

//     // Now we can get the session or user object
//     const {
//       data: { user },
//     } = await supabaseClient.auth.getUser()

//     const { data, error } = await supabaseClient.from('dept_members').select('*').match({ dept_id: deptUid, user_id: createdFor, active: true })
//     if (error) throw error

//     if (data.length === 0) {
//       const { data, error } = await supabaseClient
//         .from('dept_members')
//         .insert({
//           created_at: createdAt,
//           updated_at: createdAt,
//           dept_id: deptUid,
//           user_id: createdFor,
//           created_by_id: createdById,
//           active: true
//         })
//         .select();
//       if (error) throw error
//       if (data.length === 1) {
//         const { data, error } = await supabaseClient
//           .from('dept_user_key')
//           .insert({
//             updated_at: createdAt,
//             user_id: createdFor,
//             created_by_id: createdById,
//             enc_key: encKey,
//             back_key: backKey,
//             dept_id: deptUid,
//             active: true,
//           })
//           .select();
//         return new Response(JSON.stringify({ user, data }), {
//           headers: { 'Content-Type': 'application/json' },
//           status: 200,
//         });
//       }
//       return new Response(JSON.stringify({ user, data }), {
//         headers: { 'Content-Type': 'application/json' },
//         status: 200,
//       });
//     }

//     if (data.length === 1) {
//       const { data, error } = await supabaseClient
//           .from('dept_user_key')
//           .insert({
//             updated_at: createdAt,
//             user_id: createdFor,
//             created_by_id: createdById,
//             enc_key: encKey,
//             back_key: backKey,
//             dept_id: deptUid,
//             active: true,
//           })
//           .select();
//         return new Response(JSON.stringify({ user, data }), {
//           headers: { 'Content-Type': 'application/json' },
//           status: 200,
//         });
//     }

//     return new Response(JSON.stringify({ user, data }), {
//       headers: { 'Content-Type': 'application/json' },
//       status: 200,
//     })
//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       headers: { 'Content-Type': 'application/json' },
//       status: 400,
//     })
//   }
// })

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
