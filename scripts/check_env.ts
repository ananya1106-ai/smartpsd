console.log('Available env keys:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('POSTGRES') || key.includes('DB') || key.includes('URL') || key.includes('SERVICE')) {
    console.log(key, 'is present (length:', process.env[key]?.length, ')');
  }
});
