'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Filter,
  Search,
  Pause,
  Play,
  Square
} from 'lucide-react'
import { useSocket, useSocketListener } from '@/hooks/use-socket'

interface LogEntry {
  id: string
  sourceId: string
  jobId?: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  message: string
  details?: string
  timestamp: string
  job?: {
    name: string
  }
  source?: {
    name: string
  }
}

interface JobUpdate {
  jobId: string
  status: string
  progress?: number
  recordsProcessed?: number
  recordsSuccess?: number
  recordsFailed?: number
  timestamp: string
}

export default function MonitoringPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [jobUpdates, setJobUpdates] = useState<Record<string, JobUpdate>>({})
  const [systemStats, setSystemStats] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [logFilter, setLogFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { socket, isConnected: socketConnected, joinDashboard, subscribeToLogs, getStats } = useSocket()

  useEffect(() => {
    setIsConnected(socketConnected)
    if (socketConnected) {
      joinDashboard()
      subscribeToLogs()
      getStats()
      
      // Set up periodic stats refresh
      const statsInterval = setInterval(getStats, 30000)
      return () => clearInterval(statsInterval)
    }
  }, [socketConnected])

  // Listen for new logs
  useSocketListener(socket, 'new-log', (log: LogEntry) => {
    setLogs(prev => {
      const newLogs = [log, ...prev].slice(0, 1000) // Keep last 1000 logs
      return newLogs
    })
    
    // Auto-scroll to top if enabled
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  })

  // Listen for job updates
  useSocketListener(socket, 'job-update', (update: JobUpdate) => {
    setJobUpdates(prev => ({
      ...prev,
      [update.jobId]: update
    }))
  })

  // Listen for system alerts
  useSocketListener(socket, 'system-alert', (alert: any) => {
    console.log('System alert:', alert)
    // Could show toast notification here
  })

  // Listen for stats updates
  useSocketListener(socket, 'stats-data', (stats: any) => {
    setSystemStats(stats)
  })

  // Listen for initial logs data
  useSocketListener(socket, 'logs-data', (initialLogs: LogEntry[]) => {
    setLogs(initialLogs)
  })

  const filteredLogs = logs.filter(log => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.job?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50'
      case 'WARN': return 'text-yellow-600 bg-yellow-50'
      case 'INFO': return 'text-blue-600 bg-blue-50'
      case 'DEBUG': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level}] ${log.job?.name ? `[${log.job.name}]` : ''} ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `etl-logs-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Real-time Monitoring</h1>
            <p className="text-muted-foreground">
              Live monitoring of ETL jobs and system activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              <Activity className="h-3 w-3 mr-1" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => getStats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalJobs}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.activeJobs} running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.failedJobs} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalDataSources}</div>
                <p className="text-xs text-muted-foreground">
                  Connected sources
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeJobs}</div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Jobs */}
        {Object.keys(jobUpdates).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Job Monitoring</CardTitle>
              <CardDescription>
                Real-time progress of running ETL jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(jobUpdates).map(([jobId, update]) => (
                  <div key={jobId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(update.status)}
                      <div>
                        <p className="font-medium">Job {jobId}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {update.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {update.recordsProcessed?.toLocaleString() || 0} records
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {update.recordsSuccess?.toLocaleString() || 0} success, {update.recordsFailed?.toLocaleString() || 0} failed
                        </p>
                      </div>
                      {update.progress !== undefined && (
                        <div className="w-32">
                          <Progress value={update.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{update.progress}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs and Monitoring */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live System Logs</CardTitle>
                    <CardDescription>
                      Real-time log streams from all ETL activities
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={clearLogs}>
                      Clear
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportLogs}>
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAutoScroll(!isAutoScroll)}
                    >
                      {isAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Select value={logFilter} onValueChange={setLogFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="ERROR">Errors</SelectItem>
                        <SelectItem value="WARN">Warnings</SelectItem>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="DEBUG">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Logs Display */}
                <ScrollArea className="h-96 w-full border rounded-md p-4" ref={logContainerRef}>
                  <div className="space-y-2">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No logs found
                      </div>
                    ) : (
                      filteredLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                            {log.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              {log.job && (
                                <Badge variant="outline" className="text-xs">
                                  {log.job.name}
                                </Badge>
                              )}
                              {log.source && (
                                <span className="text-xs text-muted-foreground">
                                  {log.source.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-mono break-all">{log.message}</p>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                  Details
                                </summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(JSON.parse(log.details), null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Resource utilization metrics
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
                    ETL job execution metrics
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

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>
                  Recent system alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Connection Timeout</p>
                      <p className="text-sm text-muted-foreground">
                        MySQL Production database connection timeout after 30 seconds
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">High Memory Usage</p>
                      <p className="text-sm text-muted-foreground">
                        Job Executor memory usage exceeded 80% threshold
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Job Completed Successfully</p>
                      <p className="text-sm text-muted-foreground">
                        Customer Data Sync completed with 100% success rate
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}