const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vztoftcjbwzwioxarovy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04';

async function createUserProfile() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        console.log('🔍 Looking for user dparker918@yahoo.com...');
        
        // First, find the user in auth.users
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
            console.error('❌ Error fetching users:', userError);
            return;
        }
        
        const user = users.users.find(u => u.email === 'dparker918@yahoo.com');
        if (!user) {
            console.error('❌ User not found in auth.users');
            return;
        }
        
        console.log('✅ User found:', user.id, user.email);
        
        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (!profileError && existingProfile) {
            console.log('✅ Profile already exists:', existingProfile);
            console.log('Current tier:', existingProfile.subscription_tier);
            
            // Update to pro if not already
            if (existingProfile.subscription_tier !== 'pro') {
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update({ subscription_tier: 'pro', subscription_status: 'active' })
                    .eq('id', user.id);
                    
                if (updateError) {
                    console.error('❌ Error updating profile:', updateError);
                } else {
                    console.log('✅ Profile updated to Pro tier');
                }
            }
            return;
        }
        
        // Create new profile
        console.log('📝 Creating new profile...');
        const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
                id: user.id,
                subscription_tier: 'pro',
                subscription_status: 'active'
            })
            .select()
            .single();
            
        if (createError) {
            console.error('❌ Error creating profile:', createError);
        } else {
            console.log('✅ Profile created successfully:', newProfile);
        }
        
    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

createUserProfile(); 