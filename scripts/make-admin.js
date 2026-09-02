import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAdmin(email) {
  console.log(`Looking up user with email: ${email}`);
  
  // Find user in auth.users via admin API
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching users:', authError);
    return;
  }

  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error(`User with email ${email} not found.`);
    console.log('Please register on the site first.');
    return;
  }

  console.log(`Found user: ${user.id}`);
  
  // Check if already admin
  const { data: existingAdmin, error: checkError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single();
    
  if (existingAdmin) {
    console.log('User is already an admin!');
    return;
  }

  // Insert into admins
  const { error: insertError } = await supabase
    .from('admins')
    .insert([{ id: user.id }]);
    
  if (insertError) {
    console.error('Error making user admin:', insertError);
  } else {
    console.log('✅ Successfully promoted user to Admin!');
    console.log('You can now navigate to http://localhost:3000/admin');
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

makeAdmin(email);
