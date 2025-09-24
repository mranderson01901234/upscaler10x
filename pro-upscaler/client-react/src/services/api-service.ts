// API Service for connecting React dashboard with backend
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3002';
  }

  // Helper method for making authenticated requests
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('supabase_token'); // Adjust based on your auth implementation
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // User profile and usage
  async getUserProfile() {
    return this.makeRequest('/api/user/profile');
  }

  async getUserUsageStats() {
    return this.makeRequest('/api/user/usage-stats');
  }

  // Payment and subscription methods
  async getSubscriptionTiers() {
    return this.makeRequest('/api/payments/tiers');
  }

  async getCurrentSubscription() {
    return this.makeRequest('/api/payments/subscription');
  }

  async createCheckoutSession(tier: string) {
    return this.makeRequest('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        tier,
        success_url: `${window.location.origin}/dashboard?payment=success`,
        cancel_url: `${window.location.origin}/dashboard?payment=cancelled`
      })
    });
  }

  async createBillingPortalSession() {
    return this.makeRequest('/api/payments/create-billing-portal', {
      method: 'POST',
      body: JSON.stringify({
        return_url: `${window.location.origin}/dashboard`
      })
    });
  }

  async cancelSubscription() {
    return this.makeRequest('/api/payments/cancel-subscription', {
      method: 'POST'
    });
  }

  // Processing history
  async getProcessingHistory(filters?: {
    search?: string;
    status?: string;
    type?: string;
    dateRange?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/api/processing/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(url);
  }

  // System status
  async getSystemHealth() {
    return this.makeRequest('/health');
  }

  async getProEngineStatus() {
    try {
      const response = await fetch('http://localhost:3007/health');
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  // Utility methods
  redirectToCheckout(checkoutUrl: string) {
    window.location.href = checkoutUrl;
  }

  redirectToBillingPortal(portalUrl: string) {
    window.open(portalUrl, '_blank');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 