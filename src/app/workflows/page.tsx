'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Settings, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  Zap,
  Brain,
  Database,
  FileText
} from 'lucide-react';

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'queued';
  started_at: string;
  completed_at?: string;
  progress: number;
  current_step?: string;
  total_steps: number;
  completed_steps: number;
  error_message?: string;
  metrics: {
    duration: number;
    records_processed: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

export default function WorkflowManagementPage() {
  const [activeTab, setActiveTab] = useState<'designer' | 'executions' | 'templates' | 'monitoring'>('designer');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
  }, []);

  const loadWorkflows = async () => {
    setWorkflows([
      {
        id: 'simple-pipeline',
        name: 'Simple Data Pipeline',
        description: 'Basic ETL workflow for data processing',
        status: 'draft',
        last_modified: '2025-11-05T10:00:00Z',
        executions_count: 5,
        success_rate: 95
      },
      {
        id: 'advanced-analytics',
        name: 'Advanced Analytics Pipeline',
        description: 'Complex ETL with AI-powered data analysis',
        status: 'active',
        last_modified: '2025-11-05T14:00:00Z',
        executions_count: 12,
        success_rate: 89
      }
    ]);
  };

  const loadExecutions = async () => {
    setExecutions([
      {
        id: 'exec-1',
        workflow_id: 'simple-pipeline',
        status: 'running',
        started_at: '2025-11-05T15:00:00Z',
        progress: 65,
        current_step: 'transform-data',
        total_steps: 5,
        completed_steps: 3,
        metrics: {
          duration: 15.5,
          records_processed: 12500,
          memory_usage: 2.1,
          cpu_usage: 45
        }
      },
      {
        id: 'exec-2',
        workflow_id: 'advanced-analytics',
        status: 'completed',
        started_at: '2025-11-05T14:30:00Z',
        completed_at: '2025-11-05T14:45:00Z',
        progress: 100,
        total_steps: 8,
        completed_steps: 8,
        metrics: {
          duration: 15.0,
          records_processed: 50000,
          memory_usage: 4.2,
          cpu_usage: 78
        }
      }
    ]);
  };

  const handleRunWorkflow = async (workflowData: any) => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      
      const result = await response.json();
      if (result.success) {
        loadExecutions();
        alert('Workflow started successfully!');
      } else {
        alert('Failed to start workflow: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to run workflow:', error);
      alert('Failed to start workflow');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      
      const result = await response.json();
      if (result.success) {
        loadWorkflows();
        alert('Workflow saved successfully!');
      } else {
        alert('Failed to save workflow: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const getAIInsights = async (workflowId: string) => {
    try {
      const response = await fetch('/api/ai/workflow-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowId,
          prompt: 'analyze performance and suggest optimizations'
        })
      });
      
      const data = await response.json();
      setAiInsights(data);
    } catch (error) {
      console.error('Failed to get AI insights:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
              <p className="text-sm text-gray-600">Design, monitor, and optimize your ETL workflows</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => getAIInsights(workflows[0]?.id)}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <Brain className="w-4 h-4 mr-2 inline" />
                AI Insights
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'designer', name: 'Designer', icon: Settings },
              { id: 'executions', name: 'Executions', icon: Play },
              { id: 'monitoring', name: 'Monitoring', icon: BarChart3 }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'designer' && (
          <div className="bg-white rounded-lg border p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Workflow Designer</h2>
              <p className="text-gray-600 mb-8">
                Create and manage your ETL workflows with drag-and-drop interface
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                       onClick={() => setSelectedWorkflow(workflow)}>
                    <h3 className="font-semibold text-lg mb-2">{workflow.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{workflow.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600">{workflow.success_rate}% success rate</span>
                      <span className="text-gray-500">{workflow.executions_count} runs</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedWorkflow && (
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Edit: {selectedWorkflow.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Workflow Name</label>
                      <input 
                        type="text" 
                        value={selectedWorkflow.name}
                        onChange={(e) => setSelectedWorkflow({...selectedWorkflow, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea 
                        value={selectedWorkflow.description}
                        onChange={(e) => setSelectedWorkflow({...selectedWorkflow, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleSaveWorkflow(selectedWorkflow)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save Workflow
                      </button>
                      <button 
                        onClick={() => handleRunWorkflow(selectedWorkflow)}
                        disabled={isRunning}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {isRunning ? 'Running...' : 'Run Workflow'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'executions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Workflow Executions</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {executions.filter(e => e.status === 'running').length} running,
                  {executions.filter(e => e.status === 'completed').length} completed,
                  {executions.filter(e => e.status === 'failed').length} failed
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Records
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resources
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {executions.map((execution) => (
                      <tr key={execution.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(execution.status)}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                              {execution.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {workflows.find(w => w.id === execution.workflow_id)?.name || 'Unknown'}
                          </div>
                          {execution.current_step && (
                            <div className="text-sm text-gray-500">
                              Step: {execution.current_step}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${execution.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-900">
                              {execution.completed_steps}/{execution.total_steps}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {execution.metrics.duration.toFixed(1)}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {execution.metrics.records_processed.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <Database className="w-3 h-3" />
                              <span>{execution.metrics.memory_usage}GB</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>{execution.metrics.cpu_usage}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div>
            <h2 className="text-lg font-semibold mb-6">Monitoring Dashboard</h2>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <Play className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium">Active Executions</h3>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {executions.filter(e => e.status === 'running').length}
                </div>
                <div className="text-sm text-gray-600">
                  +2 from yesterday
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-medium">Success Rate</h3>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)}%
                </div>
                <div className="text-sm text-gray-600">
                  +5% from last week
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-5 h-5 text-orange-500" />
                  <h3 className="font-medium">Avg Duration</h3>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(executions.reduce((acc, e) => acc + e.metrics.duration, 0) / executions.length)}m
                </div>
                <div className="text-sm text-gray-600">
                  -2m from last week
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium">Records Processed</h3>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {executions.reduce((acc, e) => acc + e.metrics.records_processed, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  +15% from last week
                </div>
              </div>
            </div>

            {/* Performance Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="font-semibold mb-4">Execution Trends</h3>
                <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-500">Chart would be here</span>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="font-semibold mb-4">Resource Usage</h3>
                <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-500">Chart would be here</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights Modal */}
      {aiInsights && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  AI Insights
                </h3>
                <button onClick={() => setAiInsights(null)} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {aiInsights.suggestions?.map((suggestion: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}