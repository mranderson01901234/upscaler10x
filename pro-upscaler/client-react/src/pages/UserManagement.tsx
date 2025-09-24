import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { 
  Users, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Crown,
  DollarSign,
  Calendar,
  Mail,
  Activity
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
  admin_role?: string;
  created_at: string;
  last_sign_in_at?: string;
  stripe_customer_id?: string;
}

interface UserFilters {
  search: string;
  tier: string;
  status: string;
  admin_role: string;
  dateRange: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    tier: '',
    status: '',
    admin_role: '',
    dateRange: ''
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Mock data - in real implementation, this would call the admin API
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          subscription_tier: 'pro',
          subscription_status: 'active',
          created_at: '2025-08-15T10:30:00Z',
          last_sign_in_at: '2025-09-24T14:22:00Z',
          stripe_customer_id: 'cus_123456'
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          subscription_tier: 'basic',
          subscription_status: 'active',
          created_at: '2025-09-01T09:15:00Z',
          last_sign_in_at: '2025-09-23T16:45:00Z',
          stripe_customer_id: 'cus_789012'
        },
        {
          id: '3',
          email: 'admin@proupscaler.com',
          subscription_tier: 'free',
          subscription_status: 'active',
          admin_role: 'super_admin',
          created_at: '2025-07-01T12:00:00Z',
          last_sign_in_at: '2025-09-24T18:30:00Z'
        },
        {
          id: '4',
          email: 'suspended.user@example.com',
          subscription_tier: 'basic',
          subscription_status: 'suspended',
          created_at: '2025-08-20T14:22:00Z',
          last_sign_in_at: '2025-09-20T11:15:00Z',
          stripe_customer_id: 'cus_345678'
        }
      ];

      // Apply filters
      let filteredUsers = mockUsers;
      
      if (filters.search) {
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.tier) {
        filteredUsers = filteredUsers.filter(user => user.subscription_tier === filters.tier);
      }
      
      if (filters.status) {
        filteredUsers = filteredUsers.filter(user => user.subscription_status === filters.status);
      }
      
      if (filters.admin_role) {
        filteredUsers = filteredUsers.filter(user => user.admin_role === filters.admin_role);
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800 border-gray-200',
      basic: 'bg-blue-100 text-blue-800 border-blue-200',
      pro: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[tier as keyof typeof colors] || colors.free}`}>
        {tier}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suspended':
        return <Ban className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts, subscriptions, and permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Subscription Tier</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Admin Role</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={filters.admin_role}
                onChange={(e) => handleFilterChange('admin_role', e.target.value)}
              >
                <option value="">All Users</option>
                <option value="super_admin">Super Admin</option>
                <option value="customer_support">Customer Support</option>
                <option value="billing_admin">Billing Admin</option>
                <option value="technical_admin">Technical Admin</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.subscription_status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.subscription_tier !== 'free').length}
              </p>
              <p className="text-sm text-muted-foreground">Paid Users</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Ban className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.subscription_status === 'suspended').length}
              </p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Update Subscription
              </Button>
              <Button variant="outline" size="sm">
                Suspend
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-4 font-medium text-foreground">User</th>
                <th className="text-left p-4 font-medium text-foreground">Subscription</th>
                <th className="text-left p-4 font-medium text-foreground">Status</th>
                <th className="text-left p-4 font-medium text-foreground">Role</th>
                <th className="text-left p-4 font-medium text-foreground">Joined</th>
                <th className="text-left p-4 font-medium text-foreground">Last Seen</th>
                <th className="text-left p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-muted/25">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getTierBadge(user.subscription_tier)}
                      {user.stripe_customer_id && (
                        <DollarSign className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.subscription_status)}
                      <span className="text-sm text-foreground capitalize">
                        {user.subscription_status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.admin_role ? (
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-foreground capitalize">
                          {user.admin_role.replace('_', ' ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {formatLastSeen(user.last_sign_in_at)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 