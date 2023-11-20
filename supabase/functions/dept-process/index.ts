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
      name,
      shortName,
      description,
      hospName,
      hospShortName,
      fullName,
      imageUrl,
      // approved, // this one no need
      hodProofUrl,
      createdById,
      createdByName,
      createdByMmcLjm,
      pubKey,
      createdAt,
      encKey,
      backKey,
      identifier,
      notes,
      phoneNo1
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

    if (deptUid.length === 0) {
      // create dept_pub_key first
      const { data, error } = await supabaseClient
        .from('dept_pub_key')
        .insert({
          pub_key: pubKey,
          identifier: identifier,
          active: true,
          created_by_id: createdById
        })
        .select();
      if (error) throw error // if not unique will error ba...

      // if (data.length === 0) => need to delete dept_pub_key gua...
      if (data.length === 1) {
        // create new after creating dept_pub_key
        // get length
        // if zero, delete and send error
        const { data, error } = await supabaseClient
          .from('depts')
          .insert({
            created_at: createdAt,
            name: name,
            short_name: shortName,
            description: description,
            hosp_name: hospName,
            hosp_short_name: hospShortName,
            image_url: imageUrl,
            hod_proof_url: hodProofUrl,
            created_by_id: createdById,
            created_by_name: createdByName,
            created_by_mmcljm: createdByMmcLjm,
            full_name: fullName,
            verified: false,
            identifier: identifier,
            info_history: [{
              'created_at': createdAt,
              'name': name,
              'short_name': shortName,
              'description': description,
              'hosp_name': hospName,
              'hosp_short_name': hospShortName,
              'image_url': imageUrl,
              'phone_no1': phoneNo1,
              'created_by_id': createdById
            }],
            notes: notes,
            notes_history: [{
              'created_at': createdAt,
              'created_by_id': createdById,
              'notes': notes
            }],
            phone_no1: phoneNo1
          })
          .select();
        if (error) throw error

        let deptResult: any[] = data;
        // update dept_pub_key first
        if (data.length === 1) {
          const { data, error } = await supabaseClient
            .from('dept_pub_key')
            .update({
              'dept_id': deptResult[0]['id']
            })
            .eq('identifier', identifier);
        }

        if (data.length === 1) { // this meaning after insert dept, create dept_user_key
          const { data, error } = await supabaseClient
            .from('dept_user_key')
            .insert({
              'user_id': createdById,
              'enc_key': encKey,
              'back_key': backKey,
              'created_by_id': createdById,
              'dept_id': deptResult[0]['id'],
              'identifier': identifier,
              'active': true
            }).select();
          if (error) throw error

          if (data.length === 1) {
            const { data, error } = await supabaseClient.from('depts').select('id').eq('id', deptResult[0]['id'])
            return new Response(JSON.stringify({ user, data }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            });
          } else { // this meaning if did NOT create dept_user_key successfully, delete dept
            // no delete for dept_pub_key yet - later lah see if need
            const { error } = await supabase.from('depts').delete().eq('id', deptResult[0]['id'])
            if (error) throw error // later try if record not exist is it error when delete?
            const { error } = await supabase.from('dept_user_key').delete().match({
              'user_id': createdById,
              'enc_key': encKey,
              'back_key': backKey,
              'created_by_id': createdById,
              'identifier': identifier,
              // 'dept_id': deptResult[0]['id'],
              'active': true
            })
            if (error) throw error
            return new Response(JSON.stringify({ error: 'Unable to create dept' }), { // this error how to use/get in flutter?
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            })
          }
        }
      }

      // } else {
      //   // delete & return error // why?
      //   const { error } = await supabaseClient
      //     .from('depts')
      //     .delete()
      //     .match({
      //       created_at: createdAt,
      //       name: name,
      //       short_name: shortName,
      //       description: description,
      //       hosp_name: hospName,
      //       hosp_short_name: hospShortName,
      //       image_url: imageUrl,
      //       approved: false,
      //       hod_proof_url: hodProofUrl,
      //       created_by_id: createdById,
      //       pub_key: pubKey,
      //       full_name: fullName,
      //     })
      //   if (error) throw error
      //   return new Response(JSON.stringify({ error: 'Unable to create dept' }), {
      //     headers: { 'Content-Type': 'application/json' },
      //     status: 404,
      //   })
      // }

    } else { // else update  // notes is updated separately
      // when create edit dept page, only add check if user is owner
      const { data, error } = await supabaseClient.from('depts').select('info_history').match({ id: deptUid })
      if (error) throw error

      let deptArray: any[] = data;
      if (data.length === 1) {
        let infoHis: any[] = deptArray[0]['info_history'];
        infoHis.push({
          'created_at': createdAt,
          'name': name,
          'short_name': shortName,
          'description': description,
          'hosp_name': hospName,
          'hosp_short_name': hospShortName,
          'image_url': imageUrl,
          'phone_no1': phoneNo1,
          'created_by_id': createdById
        });
        const { data, error } = await supabaseClient
          .from('depts')
          .update({
            'name': name,
            'short_name': shortName,
            'description': description,
            'hosp_name': hospName,
            'hosp_short_name': hospShortName,
            'full_name': fullName,
            'image_url': imageUrl,
            // 'created_by_id': createdById,
            'phone_no1': phoneNo1,
            'info_history': infoHis
          })
          .eq('id', deptUid)
          .select();
        if (error) throw error
        return new Response(JSON.stringify({ user, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        return new Response(JSON.stringify({ error: 'Dept not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404,
        })
      }
    }

    //////

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
