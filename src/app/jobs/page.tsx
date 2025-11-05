'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Plus,
  ArrowRight,
  Calendar,
  Settings,
  Activity,
  Database,
  Eye
} from 'lucide-react'

interface Job {
  id: string
  name: string
  description?: string
  sourceId: string
  targetId: string
  query?: string
  transformRules?: string
  schedule?: string
  isActive: boolean
  status: string
  createdBy: string
  lastRun?: string
  nextRun?: string
  createdAt: string
  updatedAt: string
  source: {
    name: string
    type: string
  }
  target: {
    name: string
    type: string
  }
  creator: {
    name: string
    email: string
  }
  _count: {
    executions: number
  }
}

interface JobExecution {
  id: string
  jobId: string
  status: string
  startedAt: string
  completedAt?: string
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  errorMessage?: string
}

interface DataSource {
  id: string
  name: string
  type: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [jobExecutions, setJobExecutions] = useState<JobExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceId: '',
    targetId: '',
    query: '',
    transformRules: '',
    schedule: '',
    isActive: true
  })

  useEffect(() => {
    fetchJobs()
    fetchDataSources()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data)
      }
    } catch (error) {
      console.error('Error fetching data sources:', error)
    }
  }

  const fetchJobExecutions = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJobExecutions(data.executions || [])
      }
    } catch (error) {
      console.error('Error fetching job executions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          createdBy: 'demo-user' // In real app, get from auth
        }),
      })

      if (response.ok) {
        await fetchJobs()
        setIsCreateDialogOpen(false)
        setFormData({
          name: '',
          description: '',
          sourceId: '',
          targetId: '',
          query: '',
          transformRules: '',
          schedule: '',
          isActive: true
        })
      }
    } catch (error) {
      console.error('Error creating job:', error)
    }
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
    setFormData({
      name: job.name,
      description: job.description || '',
      sourceId: job.sourceId,
      targetId: job.targetId,
      query: job.query || '',
      transformRules: job.transformRules || '',
      schedule: job.schedule || '',
      isActive: job.isActive
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingJob) return

    try {
      const response = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchJobs()
        setIsEditDialogOpen(false)
        setEditingJob(null)
        setFormData({
          name: '',
          description: '',
          sourceId: '',
          targetId: '',
          query: '',
          transformRules: '',
          schedule: '',
          isActive: true
        })
      }
    } catch (error) {
      console.error('Error updating job:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchJobs()
      }
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  const runJob = async (jobId: string) => {
    setRunningJobs(prev => new Set(prev).add(jobId))
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/run`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchJobs()
        if (selectedJob?.id === jobId) {
          await fetchJobExecutions(jobId)
        }
      }
    } catch (error) {
      console.error('Error running job:', error)
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  const viewJobDetails = async (job: Job) => {
    setSelectedJob(job)
    await fetchJobExecutions(job.id)
  }

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
      case 'paused':
        return <Pause className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'paused':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
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
            <h1 className="text-3xl font-bold tracking-tight">ETL Jobs</h1>
            <p className="text-muted-foreground">
              Create and manage your data integration workflows
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New ETL Job</DialogTitle>
                <DialogDescription>
                  Set up a new data integration workflow
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Job Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Customer Data Sync"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule (Cron)</Label>
                    <Input
                      id="schedule"
                      value={formData.schedule}
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      placeholder="0 */6 * * * (every 6 hours)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this job does..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceId">Source Data Source</Label>
                    <Select value={formData.sourceId} onValueChange={(value) => setFormData({ ...formData, sourceId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              {source.name} ({source.type})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetId">Target Data Source</Label>
                    <Select value={formData.targetId} onValueChange={(value) => setFormData({ ...formData, targetId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              {source.name} ({source.type})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="query">Extraction Query (Optional)</Label>
                  <Textarea
                    id="query"
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder="SELECT * FROM customers WHERE updated_at > ?"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transformRules">Transform Rules (JSON)</Label>
                  <Textarea
                    id="transformRules"
                    value={formData.transformRules}
                    onChange={(e) => setFormData({ ...formData, transformRules: e.target.value })}
                    placeholder='[{"field": "email", "transform": "lowercase"}, {"field": "phone", "transform": "normalize"}]'
                    className="font-mono"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Job</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <div>
                      <CardTitle className="text-lg">{job.name}</CardTitle>
                      <CardDescription>
                        {job.source.name} → {job.target.name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.isActive ? 'default' : 'secondary'}>
                      {job.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {job.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.description && (
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Run:</span>
                    <div>{job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Run:</span>
                    <div>{job.nextRun ? new Date(job.nextRun).toLocaleString() : 'Not scheduled'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Executions:</span>
                    <div>{job._count.executions}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created by:</span>
                    <div>{job.creator.name}</div>
                  </div>
                </div>

                {job.schedule && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Schedule: {job.schedule}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runJob(job.id)}
                    disabled={!job.isActive || runningJobs.has(job.id)}
                  >
                    {runningJobs.has(job.id) ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    Run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewJobDetails(job)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(job)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Job</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{job.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(job.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job Details Dialog */}
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedJob && getStatusIcon(selectedJob.status)}
                {selectedJob?.name}
              </DialogTitle>
              <DialogDescription>
                Job execution details and history
              </DialogDescription>
            </DialogHeader>
            
            {selectedJob && (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="executions">Executions</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Source</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{selectedJob.source.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedJob.source.type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Target</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{selectedJob.target.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedJob.target.type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {selectedJob.query && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Extraction Query</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                          {selectedJob.query}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedJob.transformRules && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Transform Rules</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                          {JSON.stringify(JSON.parse(selectedJob.transformRules), null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="executions" className="space-y-4">
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {jobExecutions.map((execution) => (
                        <Card key={execution.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(execution.status)}
                                <span className="font-medium capitalize">{execution.status}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(execution.startedAt).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Processed:</span>
                                <div>{execution.recordsProcessed.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Success:</span>
                                <div className="text-green-600">{execution.recordsSuccess.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Failed:</span>
                                <div className="text-red-600">{execution.recordsFailed.toLocaleString()}</div>
                              </div>
                            </div>
                            
                            {execution.errorMessage && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                {execution.errorMessage}
                              </div>
                            )}
                            
                            {execution.recordsProcessed > 0 && (
                              <div className="mt-2">
                                <Progress 
                                  value={(execution.recordsSuccess / execution.recordsProcessed) * 100} 
                                  className="h-2" 
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round((execution.recordsSuccess / execution.recordsProcessed) * 100)}% success rate
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="logs" className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <ScrollArea className="h-96">
                        <div className="space-y-2 font-mono text-sm">
                          <div className="text-blue-600">[INFO] Job configuration loaded successfully</div>
                          <div className="text-blue-600">[INFO] Source connection established</div>
                          <div className="text-blue-600">[INFO] Target connection established</div>
                          <div className="text-green-600">[SUCCESS] Data extraction completed</div>
                          <div className="text-blue-600">[INFO] Applying transformation rules...</div>
                          <div className="text-green-600">[SUCCESS] Data transformation completed</div>
                          <div className="text-blue-600">[INFO] Loading data to target...</div>
                          <div className="text-green-600">[SUCCESS] Data load completed</div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit ETL Job</DialogTitle>
              <DialogDescription>
                Update the configuration for this job
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Job Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-schedule">Schedule (Cron)</Label>
                  <Input
                    id="edit-schedule"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sourceId">Source Data Source</Label>
                  <Select value={formData.sourceId} onValueChange={(value) => setFormData({ ...formData, sourceId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {source.name} ({source.type})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-targetId">Target Data Source</Label>
                  <Select value={formData.targetId} onValueChange={(value) => setFormData({ ...formData, targetId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {source.name} ({source.type})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-query">Extraction Query</Label>
                <Textarea
                  id="edit-query"
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-transformRules">Transform Rules (JSON)</Label>
                <Textarea
                  id="edit-transformRules"
                  value={formData.transformRules}
                  onChange={(e) => setFormData({ ...formData, transformRules: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Job</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}