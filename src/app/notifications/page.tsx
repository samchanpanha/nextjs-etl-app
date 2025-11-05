'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Send, 
  Mail, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  MarkAsRead
} from 'lucide-react'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  channels: string
  sentAt: string
  user: {
    name: string
    email: string
  }
}

interface UserSettings {
  id: string
  userId: string
  emailNotifications: boolean
  telegramNotifications: boolean
  telegramChatId?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'SYSTEM_ALERT',
    channels: ['IN_APP']
  })

  const [broadcastFormData, setBroadcastFormData] = useState({
    title: '',
    message: '',
    type: 'SYSTEM_ALERT',
    channels: ['IN_APP'],
    userRole: 'ALL'
  })

  const [settingsFormData, setSettingsFormData] = useState({
    emailNotifications: true,
    telegramNotifications: false,
    telegramChatId: ''
  })

  useEffect(() => {
    fetchNotifications()
    fetchUserSettings()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      // Mock user settings - in real app, get from auth
      setUserSettings({
        id: '1',
        userId: 'demo-user',
        emailNotifications: true,
        telegramNotifications: false,
        telegramChatId: ''
      })
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: 'demo-user' // In real app, get from auth
        }),
      })

      if (response.ok) {
        await fetchNotifications()
        setIsCreateDialogOpen(false)
        setFormData({
          title: '',
          message: '',
          type: 'SYSTEM_ALERT',
          channels: ['IN_APP']
        })
      }
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(broadcastFormData),
      })

      if (response.ok) {
        await fetchNotifications()
        setIsBroadcastDialogOpen(false)
        setBroadcastFormData({
          title: '',
          message: '',
          type: 'SYSTEM_ALERT',
          channels: ['IN_APP'],
          userRole: 'ALL'
        })
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Mock save - in real app, save to API
      console.log('Saving settings:', settingsFormData)
      setUserSettings({
        id: '1',
        userId: 'demo-user',
        ...settingsFormData
      })
      setIsSettingsDialogOpen(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'JOB_SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'JOB_FAILURE':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'SYSTEM_ALERT':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'DATA_SOURCE_ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'SCHEDULE_INFO':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-3 w-3" />
      case 'TELEGRAM':
        return <MessageSquare className="h-3 w-3" />
      default:
        return <Bell className="h-3 w-3" />
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Manage notifications and alert settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>
              <Bell className="h-3 w-3 mr-1" />
              {unreadCount} unread
            </Badge>
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                  <DialogDescription>
                    Configure how you receive notifications
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="emailNotifications"
                      checked={settingsFormData.emailNotifications}
                      onCheckedChange={(checked) => setSettingsFormData({ ...settingsFormData, emailNotifications: checked })}
                    />
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="telegramNotifications"
                      checked={settingsFormData.telegramNotifications}
                      onCheckedChange={(checked) => setSettingsFormData({ ...settingsFormData, telegramNotifications: checked })}
                    />
                    <Label htmlFor="telegramNotifications">Telegram Notifications</Label>
                  </div>

                  {settingsFormData.telegramNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                      <Input
                        id="telegramChatId"
                        value={settingsFormData.telegramChatId}
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, telegramChatId: e.target.value })}
                        placeholder="Enter your Telegram Chat ID"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Settings</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Broadcast</DialogTitle>
                  <DialogDescription>
                    Send a notification to multiple users
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBroadcast} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="broadcast-title">Title</Label>
                    <Input
                      id="broadcast-title"
                      value={broadcastFormData.title}
                      onChange={(e) => setBroadcastFormData({ ...broadcastFormData, title: e.target.value })}
                      placeholder="System Maintenance"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="broadcast-message">Message</Label>
                    <Textarea
                      id="broadcast-message"
                      value={broadcastFormData.message}
                      onChange={(e) => setBroadcastFormData({ ...broadcastFormData, message: e.target.value })}
                      placeholder="The system will be under maintenance..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="broadcast-type">Type</Label>
                      <Select value={broadcastFormData.type} onValueChange={(value) => setBroadcastFormData({ ...broadcastFormData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SYSTEM_ALERT">System Alert</SelectItem>
                          <SelectItem value="JOB_SUCCESS">Job Success</SelectItem>
                          <SelectItem value="JOB_FAILURE">Job Failure</SelectItem>
                          <SelectItem value="DATA_SOURCE_ERROR">Data Source Error</SelectItem>
                          <SelectItem value="SCHEDULE_INFO">Schedule Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="broadcast-role">Send to</Label>
                      <Select value={broadcastFormData.userRole} onValueChange={(value) => setBroadcastFormData({ ...broadcastFormData, userRole: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Users</SelectItem>
                          <SelectItem value="ADMIN">Admins Only</SelectItem>
                          <SelectItem value="USER">Regular Users</SelectItem>
                          <SelectItem value="VIEWER">Viewers Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Channels</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={broadcastFormData.channels.includes('IN_APP')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBroadcastFormData({ ...broadcastFormData, channels: [...broadcastFormData.channels, 'IN_APP'] })
                            } else {
                              setBroadcastFormData({ ...broadcastFormData, channels: broadcastFormData.channels.filter(c => c !== 'IN_APP') })
                            }
                          }}
                        />
                        <Label>In-App</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={broadcastFormData.channels.includes('EMAIL')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBroadcastFormData({ ...broadcastFormData, channels: [...broadcastFormData.channels, 'EMAIL'] })
                            } else {
                              setBroadcastFormData({ ...broadcastFormData, channels: broadcastFormData.channels.filter(c => c !== 'EMAIL') })
                            }
                          }}
                        />
                        <Label>Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={broadcastFormData.channels.includes('TELEGRAM')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBroadcastFormData({ ...broadcastFormData, channels: [...broadcastFormData.channels, 'TELEGRAM'] })
                            } else {
                              setBroadcastFormData({ ...broadcastFormData, channels: broadcastFormData.channels.filter(c => c !== 'TELEGRAM') })
                            }
                          }}
                        />
                        <Label>Telegram</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsBroadcastDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Send Broadcast</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              Your recent notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No notifications found
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`flex items-start gap-3 p-4 rounded-lg border ${notification.isRead ? 'bg-muted/30' : 'bg-background'}`}>
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className={`text-sm ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.sentAt).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            {JSON.parse(notification.channels).map((channel: string) => (
                              <span key={channel} className="text-muted-foreground" title={channel}>
                                {getChannelIcon(channel)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {notification.user.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <MarkAsRead className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(notification.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}