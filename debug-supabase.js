const { createClient } = require('@supabase/supabase-js');

console.log('Testing Supabase connection...');

const url = 'https://vztoftcjbwzwioxarovy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04';

try {
    console.log('URL:', url);
    console.log('Key length:', key.length);
    
    const supabase = createClient(url, key);
    console.log('✅ Supabase client created successfully');
    
    // Test basic functionality
    supabase.auth.getSession().then(result => {
        console.log('✅ Session check worked');
    }).catch(err => {
        console.log('⚠️ Session check failed but client creation worked:', err.message);
    });
    
} catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message);
    console.error('Stack:', error.stack);
} 