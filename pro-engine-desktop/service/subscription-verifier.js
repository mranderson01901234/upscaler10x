const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class SubscriptionVerifier {
	constructor() {
		this.supabaseUrl = process.env.SUPABASE_URL || 'https://vztoftcjbwzwioxarovy.supabase.co';
		this.supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04';
		
		if (!this.supabaseUrl || !this.supabaseKey) {
			throw new Error('Supabase configuration is required');
		}
		
		this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
		this.verificationCache = new Map();
		this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
	}

	hashToken(token) {
		return crypto.createHash('sha256').update(token || '').digest('hex').substring(0, 16);
	}

	clearCache() {
		this.verificationCache.clear();
	}

	async verifyUserSubscription(userToken) {
		try {
			if (!userToken) return null;
			const cacheKey = this.hashToken(userToken);
			const cached = this.verificationCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
				return cached.data;
			}

			const { data: userData, error: userError } = await this.supabase.auth.getUser(userToken);
			if (userError || !userData?.user) {
				console.error('Invalid authentication token:', userError, userData);
				throw new Error('Invalid authentication token');
			}

					const { data: profile, error: profileError } = await this.supabase
			.from('user_profiles')
			.select(`subscription_tier, subscription_status, subscription_tiers (max_ai_enhancements, price_monthly)`) 
			.eq('id', userData.user.id)
			.single();

		if (profileError) {
			console.error('Failed to fetch subscription data:', profileError);
			
			// If profile doesn't exist, create a default one
			if (profileError.code === 'PGRST116') {
				console.log('Creating default profile for user:', userData.user.email);
				
				// Create Pro tier for test users, free for others
				const proUsers = ['dparker918@yahoo.com', 'testpro@example.com', 'dparker91999@gmail.com'];
				const tierToCreate = proUsers.includes(userData.user.email) ? 'pro' : 'free';
				console.log('Creating profile with tier:', tierToCreate);
				
				const { data: newProfile, error: createError } = await this.supabase
					.from('user_profiles')
					.insert({
						id: userData.user.id,
						subscription_tier: tierToCreate,
						subscription_status: 'active'
					})
					.select(`subscription_tier, subscription_status, subscription_tiers (max_ai_enhancements, price_monthly)`)
					.single();
					
				if (createError) {
					console.error('Failed to create profile:', createError);
					
					// TEMPORARY WORKAROUND: If profile creation fails due to RLS, 
					// but user is in the Pro users list, grant access anyway
					if (proUsers.includes(userData.user.email)) {
						console.log('🔧 WORKAROUND: Granting Pro access despite profile creation failure for:', userData.user.email);
						
						// Create a mock profile object for this session
						profile = {
							subscription_tier: 'pro',
							subscription_status: 'active',
							subscription_tiers: {
								max_ai_enhancements: 1000,
								price_monthly: 29.99
							}
						};
					} else {
						throw new Error('Failed to create user profile');
					}
				} else {
					console.log('Profile created successfully for:', userData.user.email, 'with tier:', tierToCreate);
					// Use the newly created profile
					profile = newProfile;
				}
			} else {
				throw new Error('Failed to fetch subscription data');
			}
		}

			const subscriptionData = {
				userId: userData.user.id,
				email: userData.user.email,
				tier: profile?.subscription_tier || 'free',
				status: profile?.subscription_status || 'active',
				features: profile?.subscription_tiers || null,
				expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				verified_at: new Date().toISOString()
			};

			console.log('[SubscriptionVerifier] User:', subscriptionData.email, '| Tier:', subscriptionData.tier, '| Status:', subscriptionData.status);

			this.verificationCache.set(cacheKey, { data: subscriptionData, timestamp: Date.now() });
			return subscriptionData;
		} catch (error) {
			console.error('Subscription verification failed:', error.message);
			return null;
		}
	}

	async checkAIAccess(userToken) {
		const subscription = await this.verifyUserSubscription(userToken);
		if (!subscription) {
			console.error('[AIAccess] No subscription found for token');
			return { hasAccess: false, reason: 'Authentication failed' };
		}
		if (!['pro', 'admin'].includes(subscription.tier)) {
			console.error('[AIAccess] Access denied for user:', subscription.email, '| Tier:', subscription.tier);
			return { hasAccess: false, reason: 'AI features require Pro or Admin subscription', currentTier: subscription.tier };
		}
		if (subscription.status !== 'active') {
			console.error('[AIAccess] Subscription not active for user:', subscription.email, '| Status:', subscription.status);
			return { hasAccess: false, reason: 'Subscription is not active', status: subscription.status };
		}
		console.log('[AIAccess] Access granted for user:', subscription.email, '| Tier:', subscription.tier);
		return { hasAccess: true, subscription: subscription, features: subscription.features };
	}
}

module.exports = { SubscriptionVerifier }; 