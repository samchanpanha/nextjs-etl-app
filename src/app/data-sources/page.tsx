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
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Settings
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  type: string
  connectionString: string
  description?: string
  isActive: boolean
  lastSynced?: string
  createdAt: string
  updatedAt: string
  _count: {
    jobs: number
  }
}

const dataSourceTypes = [
  { value: 'MYSQL', label: 'MySQL', icon: '🐬' },
  { value: 'POSTGRESQL', label: 'PostgreSQL', icon: '🐘' },
  { value: 'SQLITE', label: 'SQLite', icon: '🗄️' },
  { value: 'MONGODB', label: 'MongoDB', icon: '🍃' },
  { value: 'API', label: 'REST API', icon: '🌐' },
  { value: 'CSV', label: 'CSV File', icon: '📊' },
  { value: 'JSON', label: 'JSON File', icon: '📄' },
  { value: 'EXCEL', label: 'Excel File', icon: '📈' }
]

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [showConnectionStrings, setShowConnectionStrings] = useState<Record<string, boolean>>({})
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    connectionString: '',
    description: ''
  })

  useEffect(() => {
    fetchDataSources()
  }, [])

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data)
      }
    } catch (error) {
      console.error('Error fetching data sources:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchDataSources()
        setIsCreateDialogOpen(false)
        setFormData({ name: '', type: '', connectionString: '', description: '' })
      }
    } catch (error) {
      console.error('Error creating data source:', error)
    }
  }

  const handleEdit = (source: DataSource) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      type: source.type,
      connectionString: source.connectionString,
      description: source.description || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingSource) return

    try {
      const response = await fetch(`/api/data-sources/${editingSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchDataSources()
        setIsEditDialogOpen(false)
        setEditingSource(null)
        setFormData({ name: '', type: '', connectionString: '', description: '' })
      }
    } catch (error) {
      console.error('Error updating data source:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDataSources()
      }
    } catch (error) {
      console.error('Error deleting data source:', error)
    }
  }

  const testConnection = async (source: DataSource) => {
    setTestingConnection(source.id)
    
    // Simulate connection testing
    setTimeout(() => {
      setTestingConnection(null)
      // In real app, this would call an API endpoint to test the connection
    }, 2000)
  }

  const toggleConnectionString = (id: string) => {
    setShowConnectionStrings(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const copyConnectionString = (connectionString: string) => {
    navigator.clipboard.writeText(connectionString)
  }

  const maskConnectionString = (connectionString: string) => {
    if (connectionString.length <= 8) return '********'
    return connectionString.substring(0, 4) + '********' + connectionString.substring(connectionString.length - 4)
  }

  const getTypeIcon = (type: string) => {
    const sourceType = dataSourceTypes.find(t => t.value === type)
    return sourceType?.icon || '🔌'
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
            <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
            <p className="text-muted-foreground">
              Manage your database connections and data endpoints
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Data Source</DialogTitle>
                <DialogDescription>
                  Configure a new database connection or data endpoint
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Production Database"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source type" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectionString">Connection String</Label>
                  <Textarea
                    id="connectionString"
                    value={formData.connectionString}
                    onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                    placeholder="mysql://user:password@localhost:3306/database"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this data source"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Data Source</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((source) => (
            <Card key={source.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(source.type)}</span>
                    <div>
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <CardDescription>{source.type}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={source.isActive ? 'default' : 'secondary'}>
                      {source.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {source.description && (
                  <p className="text-sm text-muted-foreground">{source.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Connection String</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleConnectionString(source.id)}
                      >
                        {showConnectionStrings[source.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyConnectionString(source.connectionString)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    {showConnectionStrings[source.id] 
                      ? source.connectionString 
                      : maskConnectionString(source.connectionString)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{source._count.jobs} jobs</span>
                  <span>Last synced: {source.lastSynced ? new Date(source.lastSynced).toLocaleDateString() : 'Never'}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(source)}
                    disabled={testingConnection === source.id}
                  >
                    {testingConnection === source.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <TestTube className="h-3 w-3 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(source)}
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
                        <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{source.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(source.id)}>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Data Source</DialogTitle>
              <DialogDescription>
                Update the configuration for this data source
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSourceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-connectionString">Connection String</Label>
                <Textarea
                  id="edit-connectionString"
                  value={formData.connectionString}
                  onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Data Source</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}