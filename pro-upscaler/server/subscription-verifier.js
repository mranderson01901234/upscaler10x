const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class SubscriptionVerifier {
	constructor() {
		this.supabaseUrl = process.env.SUPABASE_URL;
		this.supabaseKey = process.env.SUPABASE_ANON_KEY;
		this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
		this.verificationCache = new Map();
		this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
	}

	hashToken(token) {
		return crypto.createHash('sha256').update(token || '').digest('hex').substring(0, 16);
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
				throw new Error('Invalid authentication token');
			}
			const { data: profile, error: profileError } = await this.supabase
				.from('user_profiles')
				.select('subscription_tier, subscription_status')
				.eq('id', userData.user.id)
				.single();
			if (profileError) throw profileError;
			const subscriptionData = {
				userId: userData.user.id,
				email: userData.user.email,
				tier: profile?.subscription_tier || 'free',
				status: profile?.subscription_status || 'active',
				verified_at: new Date().toISOString()
			};
			this.verificationCache.set(cacheKey, { data: subscriptionData, timestamp: Date.now() });
			return subscriptionData;
		} catch (error) {
			console.error('Subscription verification failed:', error.message);
			return null;
		}
	}

	async checkAIAccess(userToken) {
		const subscription = await this.verifyUserSubscription(userToken);
		if (!subscription) return { hasAccess: false, reason: 'Authentication failed' };
		if (!['basic', 'pro', 'admin'].includes(subscription.tier)) return { hasAccess: false, reason: 'Subscription tier insufficient', currentTier: subscription.tier };
		if (subscription.status !== 'active') return { hasAccess: false, reason: 'Subscription inactive' };
		return { hasAccess: true, subscription };
	}
}

module.exports = { SubscriptionVerifier }; 