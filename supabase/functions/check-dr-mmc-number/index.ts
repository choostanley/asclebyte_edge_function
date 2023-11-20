// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as postgres from 'https://deno.land/x/postgres@v0.14.2/mod.ts'

console.log("Hello from Functions!")

const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!
const pool = new postgres.Pool(databaseUrl, 4, true)

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, mmc, title } = await req.json();
    let urls: any[] = [];
    let i: number = 0;
    let plusName = name.split("&").join('+');
    let upperName = name.toUpperCase();
    let result: boolean = false;
    let data1 = {
      verified: result,
      duplicate: false
    }
    let mmcs: string[] = [];


    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // const { data, error } = await supabaseClient.from('auth.users');
    // above line can only pakai 1 time adoi

    const connection = await pool.connect()
    try {
      // const ressbaby = await connection.queryObject`SELECT raw_app_meta_data ->> 'provider' FROM auth.users`
      const ressbaby = await connection.queryObject`SELECT raw_user_meta_data FROM auth.users`
      const animals = ressbaby.rows // [{ id: 1, name: "Lion" }, ...]
      let holder: Object = {};
      animals?.forEach(function (map) {
        if (map instanceof Object && 'raw_user_meta_data' in map) {
          if (map.raw_user_meta_data instanceof Object) {
            holder = map.raw_user_meta_data
          }
        }
        if (holder instanceof Object && 'mmcljm' in holder && 'title' in holder) { // 'mmc_ljm' in holder && 'title' in holder
          if (typeof holder.title === 'string' && holder.title === title && typeof holder.mmcljm === 'string') { // typeof holder.title === 'string' && holder.title === 'dr' && typeof holder.mmc_ljm === 'number'
            mmcs.push(holder.mmcljm)
          }
        }
        holder = {};
      })
    } finally {
      // Release the connection back into the pool
      connection.release()
    }

    if (mmcs.includes(mmc)) {
      data1.duplicate = true
      return new Response(
        JSON.stringify(data1),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // const { data, error } = await supabaseClient.from('users').select('mmc').eq('job', 'dr')
    // data?.forEach((map) => mmcs.push(map['mmc']))
    // // console.log(typeof data?.[0])
    // // console.log(mmcs)
    // // console.log(mmcs.includes(mmc))
    // if (mmcs.includes(mmc)) {
    //   return new Response(
    //     JSON.stringify(data1),
    //     { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    //   );
    // }

    // if 'Sn' can bagi approve already - actually just checking for duplicate
    if (title === 'Sn') {
      let data2 = {
        verified: true,
        duplicate: false
      }
      return new Response(
        JSON.stringify(data2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const urlResponse1 = await fetch('https://meritsmmc.moh.gov.my/search/registeredDoctor?name=' + plusName)
      .then((resp) => resp.text());
    const name1 = urlResponse1.split("<").find((str) => str.includes(upperName));
    let name2: any;
    if (typeof name1 === 'string') {
      name2 = name1.split(">").find((str) => str.includes(upperName));
    }


    if (typeof name2 === 'string' && name2 === upperName) {
      const list2: string[] = urlResponse1.split(";").filter((str) => str.includes("viewDoctor"));
      list2.forEach((vds) =>
        urls.push(vds.split("&").find((str) => str.includes("viewDoctor")))
      );
    }
    else {
      return new Response(
        JSON.stringify(data1),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let fullReg;
    let provReg;
    let regex;
    let ansArray: any[];
    let mmcPrep = mmc.split(" ").pop(); // mmc.substring(0, mmc.length - 3); // because i was using '99555'
    console.log(mmcPrep)
    while (i < urls.length) {
      fullReg = '';
      provReg = '';
      regex = null;
      if (typeof urls[i] === 'string') {
        let ans = await fetch(urls[i])
          .then((resp) => resp.text());
        ansArray = ans.split("<");
        fullReg = ansArray.find((str) => str.includes("Full Registration Number"));
        provReg = ansArray.find((str) => str.includes("Provisional Registration Number"));
        regex = fullReg.match(/\b\d{5}\b/g)
        if (fullReg.includes(mmcPrep)) {
          result = true;
          break;
        } else if ((regex === null) && (provReg.includes(mmcPrep))) {
          result = true;
          break;
        }
      }
      i++;
    }

    data1.verified = result;

    return new Response(
      JSON.stringify(data1),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"stanley choo shen hong", "mmc": "99555"}'
