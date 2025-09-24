import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  Image,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface ProcessingHistoryItem {
  id: string;
  filename: string;
  originalSize: string;
  scaleFactor: string;
  outputSize: string;
  processingTime: number;
  status: 'completed' | 'processing' | 'failed';
  timestamp: Date;
  downloadUrl?: string;
  processingType: 'standard' | 'ai_enhanced';
}

export function ProcessingHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Mock data - in real app, this would come from API
  const [historyItems] = useState<ProcessingHistoryItem[]>([
    {
      id: '1',
      filename: 'landscape_sunset_4k.jpg',
      originalSize: '8.5 MB',
      scaleFactor: '4x',
      outputSize: '136 MB',
      processingTime: 18.3,
      status: 'completed',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      downloadUrl: '#',
      processingType: 'ai_enhanced'
    },
    {
      id: '2',
      filename: 'portrait_wedding.png',
      originalSize: '12.1 MB',
      scaleFactor: '2x',
      outputSize: '48.4 MB',
      processingTime: 8.7,
      status: 'completed',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      downloadUrl: '#',
      processingType: 'standard'
    },
    {
      id: '3',
      filename: 'artwork_vintage.jpg',
      originalSize: '6.2 MB',
      scaleFactor: '8x',
      outputSize: '396.8 MB',
      processingTime: 45.2,
      status: 'completed',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      downloadUrl: '#',
      processingType: 'ai_enhanced'
    },
    {
      id: '4',
      filename: 'screenshot_app.png',
      originalSize: '2.1 MB',
      scaleFactor: '4x',
      outputSize: '33.6 MB',
      processingTime: 12.1,
      status: 'failed',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      processingType: 'standard'
    },
    {
      id: '5',
      filename: 'nature_macro.jpg',
      originalSize: '15.3 MB',
      scaleFactor: '2x',
      outputSize: '61.2 MB',
      processingTime: 9.8,
      status: 'completed',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      downloadUrl: '#',
      processingType: 'ai_enhanced'
    }
  ]);

  const filteredItems = useMemo(() => {
    return historyItems.filter(item => {
      const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.processingType === typeFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const now = new Date();
        const itemDate = item.timestamp;
        
        switch (dateFilter) {
          case 'today':
            matchesDate = itemDate.toDateString() === now.toDateString();
            break;
          case 'week':
            matchesDate = (now.getTime() - itemDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            matchesDate = (now.getTime() - itemDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [historyItems, searchTerm, statusFilter, typeFilter, dateFilter]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Processing History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your image processing history
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search filenames..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="ai_enhanced">AI Enhanced</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredItems.length} of {historyItems.length} items
        </span>
        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTypeFilter('all');
              setDateFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* History Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">File</th>
                <th className="text-left p-4 font-medium">Scale</th>
                <th className="text-left p-4 font-medium">Size</th>
                <th className="text-left p-4 font-medium">Time</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Image className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.originalSize} → {item.outputSize}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {item.scaleFactor}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div>{item.outputSize}</div>
                      <div className="text-xs text-muted-foreground">
                        from {item.originalSize}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{item.processingTime}s</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.processingType === 'ai_enhanced' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {item.processingType === 'ai_enhanced' ? 'AI Enhanced' : 'Standard'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className="text-sm capitalize">{item.status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{formatTimeAgo(item.timestamp)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {item.status === 'completed' && item.downloadUrl && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === 'failed' && (
                        <Button variant="ghost" size="sm">
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No processing history found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Start by uploading and processing your first image.'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
} 