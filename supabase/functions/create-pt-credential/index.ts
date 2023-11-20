// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// create-pt-credential

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  try {
    const {
      name,
      icNumber,
      dob,
      genderIndex, // int
      race,
      address,
      phoneNo1,
      phoneNo2,
      createdBy,
      random32enc,
      siv,
      deptId,
      createdAt,
      newPt,
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

    // no need limit 1 ba, since ic_number isUnique
    const { data, error } = await supabaseClient.from('patient_ic').select('*').eq('ic_number', icNumber)
    if (error) throw error

    let ptIcArray: any[] = data;
    // console.log does work in production

    // data == icData
    if (data.length === 0) { // ic not created yet
      const { data, error } = await supabaseClient
        .from('patient_ic')
        .insert({ 'ic_number': icNumber, 'created_by': createdBy })
        .select();
      if (error) throw error
      let ansArray: any[] = data;

      if (data != null && data.length === 1) {
        const { data, error } = await supabaseClient
          .from('pt_credentials')
          .insert({ // create pt credential
            'pt_ic_id': ansArray[0]['id'],
            'dept_id': deptId,
            'genderi': genderIndex,
            'race': race,
            'dob': dob,
            'created_by': createdBy,
            'name': name,
            'address': address,
            'phone_no1': phoneNo1,
            'phone_no2': phoneNo2,
            'created_at': createdAt,
            'kaeys': random32enc,
            'siv': siv,
            'identifier': identifier,
            'info_history': [{
              'genderi': genderIndex,
              'race': race,
              'dob': dob,
              'created_by': createdBy,
              'name': name,
              'address': address,
              'phone_no1': phoneNo1,
              'phone_no2': phoneNo2,
              'created_at': createdAt
            }]
          })
          .select();
        if (error) throw error
        return new Response(JSON.stringify({ user, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // data == icData
    if (data.length === 1) { // ic already created
      const { data, error } = await supabaseClient
        .from('pt_credentials').select('*').match({ pt_ic_id: ptIcArray[0]['id'], dept_id: deptId })
      if (error) throw error
      let ptCredArray: any[] = data;

      // pt credential under this dept not created yet
      if (ptCredArray.length === 0) { 
        const { data, error } = await supabaseClient
          .from('pt_credentials')
          .insert({ // create pt credential
            'pt_ic_id': ptIcArray[0]['id'],
            'dept_id': deptId,
            'genderi': genderIndex,
            'race': race,
            'dob': dob,
            'created_by': createdBy,
            'name': name,
            'address': address,
            'phone_no1': phoneNo1,
            'phone_no2': phoneNo2,
            'created_at': createdAt,
            'kaeys': random32enc,
            'siv': siv,
            'identifier': identifier,
            'info_history': [{
              'genderi': genderIndex,
              'race': race,
              'dob': dob,
              'created_by': createdBy,
              'name': name,
              'address': address,
              'phone_no1': phoneNo1,
              'phone_no2': phoneNo2,
              'created_at': createdAt
            }]
          })
          .select();
        if (error) throw error
        return new Response(JSON.stringify({ user, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // pt credential under this dept ALREADY created
      if (ptCredArray.length === 1) {
        if (newPt) { // coming from create pt page
          // query 1 more time wont die de
          const { data, error } = await supabaseClient
            .from('patient_ic').select('*, pt_credentials!left(*)').match({
              'ic_number': icNumber,
              'pt_credentials.dept_id': deptId
            })
          if (error) throw error

          return new Response(JSON.stringify({ user, data }), { // if its pt ic, directly go to pt screen
            headers: { 'Content-Type': 'application/json' },
            status: 300, // pt already exist, later query here and return data
          });
        }

        // if (newPt === false) meaning is
        // for UPDATE pt details
        let infoHis: any[] = ptCredArray[0]['info_history'];
        infoHis.push({
          'genderi': genderIndex,
          'race': race,
          'dob': dob,
          'created_by': createdBy,
          'name': name,
          'address': address,
          'phone_no1': phoneNo1,
          'phone_no2': phoneNo2,
          'created_at': createdAt
        });

        const { data, error } = await supabaseClient
          .from('pt_credentials')
          .update({
            // 'dept_id': deptId,
            'genderi': genderIndex,
            'race': race,
            'dob': dob,
            'created_by': createdBy,
            'name': name,
            'address': address,
            'phone_no1': phoneNo1,
            'phone_no2': phoneNo2,
            'created_at': createdAt,
            'info_history': infoHis
          })
          .eq('id', ptCredArray[0]['id'])
          .select();
        if (error) throw error
        return new Response(JSON.stringify({ user, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
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
//   --data '{"icNumber":"123456-01-1234"}'
