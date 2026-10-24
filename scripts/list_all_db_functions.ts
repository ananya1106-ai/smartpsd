import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function listAllFunctions() {
  await supabaseSignIn({ email: 'admin@smartpds.gov.in', password: 'AdminPassword#2026' });

  // Test if we can query pg_proc or information_schema through PostgREST
  const { data: procs, error: procErr } = await supabase.from('pg_proc').select('proname');
  console.log('pg_proc:', { procs, error: procErr?.message });

  const { data: routines, error: routErr } = await supabase.from('routines').select('routine_name');
  console.log('routines:', { routines, error: routErr?.message });
}

listAllFunctions().catch(console.error);
