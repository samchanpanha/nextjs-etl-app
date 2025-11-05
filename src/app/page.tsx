'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  Play, 
  Pause, 
  Settings, 
  Bell, 
  Users, 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
  totalDataSources: number
  activeDataSources: number
  totalRecordsProcessed: number
  successRate: number
}

interface RecentJob {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  recordsProcessed: number
  startTime: string
  source: string
  target: string
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalDataSources: 0,
    activeDataSources: 0,
    totalRecordsProcessed: 0,
    successRate: 0
  })

  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial data loading
    const loadDashboardData = async () => {
      setIsLoading(true)
      
      // Mock data - in real app, this would come from API
      setStats({
        totalJobs: 24,
        activeJobs: 3,
        completedJobs: 18,
        failedJobs: 3,
        totalDataSources: 8,
        activeDataSources: 7,
        totalRecordsProcessed: 1250000,
        successRate: 85.7
      })

      setRecentJobs([
        {
          id: '1',
          name: 'Customer Data Sync',
          status: 'running',
          progress: 67,
          recordsProcessed: 6700,
          startTime: '2024-01-15 10:30:00',
          source: 'MySQL Production',
          target: 'PostgreSQL Analytics'
        },
        {
          id: '2',
          name: 'Sales Report ETL',
          status: 'completed',
          progress: 100,
          recordsProcessed: 15420,
          startTime: '2024-01-15 09:15:00',
          source: 'API Endpoint',
          target: 'Data Warehouse'
        },
        {
          id: '3',
          name: 'Inventory Backup',
          status: 'failed',
          progress: 23,
          recordsProcessed: 2300,
          startTime: '2024-01-15 08:45:00',
          source: 'SQLite Local',
          target: 'Cloud Storage'
        }
      ])

      setAlerts([
        {
          id: '1',
          type: 'error',
          message: 'Connection timeout to MySQL Production database',
          timestamp: '2024-01-15 10:45:00'
        },
        {
          id: '2',
          type: 'warning',
          message: 'High memory usage detected in Job Executor',
          timestamp: '2024-01-15 10:30:00'
        },
        {
          id: '3',
          type: 'info',
          message: 'Scheduled maintenance in 2 hours',
          timestamp: '2024-01-15 10:00:00'
        }
      ])

      setIsLoading(false)
    }

    loadDashboardData()

    // Set up real-time updates
    const interval = setInterval(() => {
      // In real app, this would be WebSocket or polling
      console.log('Refreshing dashboard data...')
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ETL Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage your data integration workflows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/data-sources">
                <Database className="h-4 w-4 mr-2" />
                Data Sources
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/jobs">
                <Play className="h-4 w-4 mr-2" />
                Jobs
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/monitoring">
                <Activity className="h-4 w-4 mr-2" />
                Monitoring
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </a>
            </Button>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Run All Jobs
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeJobs} active, {stats.completedJobs} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.failedJobs} failed jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDataSources}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeDataSources} active connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalRecordsProcessed / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground">
                Total records synced
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Job Activity</CardTitle>
                <CardDescription>
                  Monitor the status of your ETL jobs in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.source} → {job.target}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{job.recordsProcessed.toLocaleString()} records</p>
                          <p className="text-xs text-muted-foreground">{job.startTime}</p>
                        </div>
                        <div className="w-32">
                          <Progress value={job.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{job.progress}%</p>
                        </div>
                        <Badge variant={job.status === 'running' ? 'default' : job.status === 'completed' ? 'secondary' : 'destructive'}>
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>
                  Real-time system events and job execution logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  <div className="space-y-2 font-mono text-sm">
                    <div className="text-green-600">[2024-01-15 10:45:23] INFO: Job 'Customer Data Sync' started successfully</div>
                    <div className="text-blue-600">[2024-01-15 10:45:24] DEBUG: Connecting to MySQL Production database...</div>
                    <div className="text-blue-600">[2024-01-15 10:45:25] DEBUG: Connection established, fetching schema...</div>
                    <div className="text-green-600">[2024-01-15 10:45:26] INFO: Processing 10,000 records from customers table</div>
                    <div className="text-yellow-600">[2024-01-15 10:45:30] WARN: Slow query detected (2.3s) on orders table</div>
                    <div className="text-green-600">[2024-01-15 10:45:35] INFO: Batch 1/10 completed (1,000 records)</div>
                    <div className="text-red-600">[2024-01-15 10:45:40] ERROR: Connection timeout to target database</div>
                    <div className="text-yellow-600">[2024-01-15 10:45:41] WARN: Retrying connection (attempt 2/3)...</div>
                    <div className="text-green-600">[2024-01-15 10:45:45] INFO: Connection restored, continuing sync...</div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>
                  Important notifications and system warnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                      </div>
                      <Badge variant={alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'default'}>
                        {alert.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Resource utilization and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Disk I/O</span>
                      <span>23%</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Network I/O</span>
                      <span>12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Performance</CardTitle>
                  <CardDescription>
                    Average job execution times and throughput
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Execution Time</span>
                    <span className="font-medium">3m 24s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Records/Second</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium text-green-600">85.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Queue Length</span>
                    <span className="font-medium">5 jobs</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}