const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = 'https://idryuttsllvtlcdhlelk.supabase.co';
const supabaseKey = 'sb_publishable_eHyTe1mk8XUV37PyusEakQ_zHeOlIxg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    console.log('🚀 Starting migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          console.log(`📄 Statement:`, statement.substring(0, 100) + '...');
          continue;
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('🎉 Migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Alternative: Use direct SQL execution
async function migrateDirect() {
  try {
    console.log('🚀 Starting direct migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // For direct execution, you'll need to use the dashboard
    console.log('📋 Schema loaded. Please execute this in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/idryuttsllvtlcdhlelk/sql');
    console.log('2. Copy the entire schema.sql content');
    console.log('3. Paste and execute');
    
  } catch (error) {
    console.error('💥 Failed to load schema:', error);
  }
}

// Run migration
if (require.main === module) {
  migrateDirect();
}

module.exports = { migrate, migrateDirect };
