import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { 
  User, 
  CreditCard, 
  Settings,
  Crown,
  Calendar,
  Download,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: 'active' | 'cancelled' | 'expired';
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  monthlyUsage: {
    uploads: number;
    uploadsLimit: number;
    aiEnhancements: number;
    aiLimit: number;
    processingTime: number;
  };
}

export function Account() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    subscriptionTier: 'Free',
    subscriptionStatus: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    monthlyUsage: {
      uploads: 7,
      uploadsLimit: 10,
      aiEnhancements: 2,
      aiLimit: 5,
      processingTime: 234
    }
  });

  const [notifications, setNotifications] = useState({
    processingComplete: true,
    usageLimits: true,
    billingUpdates: false,
    productUpdates: true
  });

  const uploadPercentage = (profile.monthlyUsage.uploads / profile.monthlyUsage.uploadsLimit) * 100;
  const aiPercentage = profile.monthlyUsage.aiLimit > 0 
    ? (profile.monthlyUsage.aiEnhancements / profile.monthlyUsage.aiLimit) * 100 
    : 0;

  const subscriptionTiers = [
    {
      name: 'Free',
      price: 0,
      features: ['10 uploads/month', '5 AI enhancements/month', '2x-4x upscaling', 'Standard support'],
      current: profile.subscriptionTier === 'Free'
    },
    {
      name: 'Basic',
      price: 9.99,
      features: ['Unlimited 2x-8x processing', '50 AI enhancements/month', 'Priority support', 'Batch processing'],
      current: profile.subscriptionTier === 'Basic'
    },
    {
      name: 'Pro',
      price: 19.99,
      features: ['Unlimited processing', 'Unlimited AI enhancements', 'Up to 15x upscaling', 'Premium support', 'Early access'],
      current: profile.subscriptionTier === 'Pro'
    }
  ];

  const handleUpgrade = (tierName: string) => {
    console.log(`Upgrading to ${tierName}`);
    // Implement upgrade logic
  };

  const handleBillingPortal = () => {
    console.log('Opening billing portal');
    // Implement Stripe billing portal
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, billing, and account preferences
        </p>
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Full Name</label>
            <Input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email Address</label>
            <Input value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
          </div>
        </div>

        <div className="mt-6">
          <Button>Save Changes</Button>
        </div>
      </Card>

      {/* Current Subscription */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Current Subscription</h2>
          </div>
          <Button variant="outline" onClick={handleBillingPortal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Billing Portal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Current Plan</h3>
            <div className="text-2xl font-bold">{profile.subscriptionTier}</div>
            <p className="text-sm text-muted-foreground">
              {profile.subscriptionTier === 'Free' ? 'No billing' : `$${subscriptionTiers.find(t => t.name === profile.subscriptionTier)?.price}/month`}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                profile.subscriptionStatus === 'active' ? 'bg-green-500' :
                profile.subscriptionStatus === 'cancelled' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="capitalize font-medium">{profile.subscriptionStatus}</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">
              {profile.subscriptionTier === 'Free' ? 'Account Created' : 'Next Billing'}
            </h3>
            <div className="text-sm">
              {profile.subscriptionTier === 'Free' 
                ? 'Free forever' 
                : profile.nextBillingDate.toLocaleDateString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Usage This Month */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Zap className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Usage This Month</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Uploads</span>
              <span className="text-sm text-muted-foreground">
                {profile.monthlyUsage.uploads}/{profile.monthlyUsage.uploadsLimit}
              </span>
            </div>
            <Progress value={uploadPercentage} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(uploadPercentage)}% used
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">AI Enhancements</span>
              <span className="text-sm text-muted-foreground">
                {profile.monthlyUsage.aiEnhancements}/{profile.monthlyUsage.aiLimit > 0 ? profile.monthlyUsage.aiLimit : '∞'}
              </span>
            </div>
            {profile.monthlyUsage.aiLimit > 0 ? (
              <>
                <Progress value={aiPercentage} className="mb-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(aiPercentage)}% used
                </p>
              </>
            ) : (
              <div className="text-sm text-green-600 dark:text-green-400">Unlimited</div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm">
            <strong>Total Processing Time:</strong> {profile.monthlyUsage.processingTime}s this month
          </div>
        </div>
      </Card>

      {/* Subscription Plans */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.name}
              className={`p-4 border rounded-lg ${
                tier.current 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{tier.name}</h3>
                {tier.current && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold mb-4">
                ${tier.price}
                {tier.price > 0 && <span className="text-sm font-normal">/month</span>}
              </div>
              <ul className="space-y-2 mb-4">
                {tier.features.map((feature, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {feature}
                  </li>
                ))}
              </ul>
              {!tier.current && (
                <Button 
                  className="w-full" 
                  variant={tier.name === 'Pro' ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(tier.name)}
                >
                  {tier.price > 0 ? 'Upgrade' : 'Downgrade'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Bell className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {key === 'processingComplete' && 'Processing Complete'}
                  {key === 'usageLimits' && 'Usage Limit Warnings'}
                  {key === 'billingUpdates' && 'Billing Updates'}
                  {key === 'productUpdates' && 'Product Updates'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {key === 'processingComplete' && 'Get notified when your images finish processing'}
                  {key === 'usageLimits' && 'Alerts when approaching usage limits'}
                  {key === 'billingUpdates' && 'Important billing and payment notifications'}
                  {key === 'productUpdates' && 'New features and product announcements'}
                </p>
              </div>
              <Button
                variant={value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotifications({...notifications, [key]: !value})}
              >
                {value ? 'On' : 'Off'}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>

        <div className="space-y-4">
          <Button variant="outline">
            Change Password
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download My Data
          </Button>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
} 