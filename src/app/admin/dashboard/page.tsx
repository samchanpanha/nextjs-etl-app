"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { withAuth } from '@/lib/auth';

interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
}

interface UserManagementProps {
  users: any[];
  onUserAction: (userId: string, action: string) => void;
}

interface SystemControlsProps {
  onSystemAction: (action: string) => void;
  isSystemHealthy: boolean;
}

// Helper functions
function getAlertClass(severity: string) {
  switch (severity) {
    case 'error': return 'border-red-200 bg-red-50';
    case 'warning': return 'border-yellow-200 bg-yellow-50';
    default: return 'border-blue-200 bg-blue-50';
  }
}

// User Management Component
function UserManagement({ users, onUserAction }: UserManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{user.name || user.email}</span>
                  <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'USER' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onUserAction(user.id, 'edit')}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant={user.isActive ? "destructive" : "default"}
                  onClick={() => onUserAction(user.id, user.isActive ? 'deactivate' : 'activate')}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Alerts Panel Component
function AlertsPanel({ alerts }: { alerts: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
        <CardDescription>Recent system alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <Alert key={index} className={getAlertClass(alert.severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div>
                    <strong>{alert.title}</strong>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={alert.severity === 'error' ? 'destructive' : 'default'}>
                    {alert.severity}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
          {alerts.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p>No active alerts</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// System Controls Component
function SystemControls({ onSystemAction, isSystemHealthy }: SystemControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Controls</CardTitle>
        <CardDescription>System maintenance and control operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => onSystemAction('clear_cache')} 
            variant="outline"
            className="h-20 flex flex-col"
          >
            <Database className="h-6 w-6 mb-2" />
            Clear Cache
          </Button>
          <Button 
            onClick={() => onSystemAction('restart_services')} 
            variant="outline"
            className="h-20 flex flex-col"
          >
            <Server className="h-6 w-6 mb-2" />
            Restart Services
          </Button>
          <Button 
            onClick={() => onSystemAction('backup_database')} 
            variant="outline"
            className="h-20 flex flex-col"
          >
            <HardDrive className="h-6 w-6 mb-2" />
            Backup Database
          </Button>
          <Button 
            onClick={() => onSystemAction('scale_up')} 
            variant="outline"
            className="h-20 flex flex-col"
          >
            <TrendingUp className="h-6 w-6 mb-2" />
            Scale Up
          </Button>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Status:</strong> {isSystemHealthy ? 'All systems operational' : 'System requires attention'}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function ManagementDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    uptime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
  });
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, alertsRes, usersRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/alerts'),
        fetch('/api/admin/users')
      ]);

      const metricsData = await metricsRes.json();
      const alertsData = await alertsRes.json();
      const usersData = await usersRes.json();

      setMetrics(metricsData);
      setAlerts(alertsData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleUserAction = (userId: string, action: string) => {
    console.log(`User action: ${action} for user ${userId}`);
    // Implement user action logic here
  };

  const handleSystemAction = (action: string) => {
    console.log(`System action: ${action}`);
    // Implement system action logic here
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Management Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={fetchDashboardData} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(metrics.uptime)}</div>
            <p className="text-xs text-muted-foreground">Since last restart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cpuUsage}%</div>
            <Progress value={metrics.cpuUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memoryUsage}%</div>
            <Progress value={metrics.memoryUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeConnections}</div>
            <p className="text-xs text-muted-foreground">Database connections</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.runningJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedJobs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Status</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="controls">System Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Real-time system performance monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>API Response Time</span>
                    <span className="font-mono">245ms</span>
                  </div>
                  <Progress value={45} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Database Query Time</span>
                    <span className="font-mono">89ms</span>
                  </div>
                  <Progress value={25} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cache Hit Rate</span>
                    <span className="font-mono">94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Job Queue Size</span>
                    <span className="font-mono">12</span>
                  </div>
                  <Progress value={30} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement users={users} onUserAction={handleUserAction} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsPanel alerts={alerts} />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <SystemControls onSystemAction={handleSystemAction} isSystemHealthy={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export with authentication middleware
export default ManagementDashboard;