const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminEmailToKeep = 'sanaregeorge48@gmail.com';

async function clearData() {
  console.log('Starting data cleanup...');

  // 1. Delete all transactions
  console.log('Deleting all transactions...');
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows

  if (txError) {
    console.error('Error deleting transactions:', txError);
  } else {
    console.log('Transactions deleted successfully.');
  }

  // 2. Fetch all users
  console.log('Fetching users to delete...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  // 3. Delete users EXCEPT the admin
  const usersToDelete = users.filter(u => u.email !== adminEmailToKeep);
  console.log(`Found ${usersToDelete.length} user(s) to delete (excluding ${adminEmailToKeep}).`);

  for (const user of usersToDelete) {
    console.log(`Deleting user: ${user.email} (${user.id})`);
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error(`Failed to delete ${user.email}:`, delError);
    } else {
      console.log(`Successfully deleted ${user.email}`);
    }
  }

  console.log('Data cleanup finished.');
}

clearData();
