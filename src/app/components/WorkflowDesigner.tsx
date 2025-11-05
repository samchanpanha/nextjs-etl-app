'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Download, 
  Bot,
  Database,
  Zap,
  Mail,
  CheckCircle,
  Cpu,
  Settings
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'extract' | 'transform' | 'load' | 'notification' | 'condition' | 'ai' | 'ml';
  name: string;
  description?: string;
  position: { x: number; y: number };
  config: any;
  status?: 'running' | 'completed' | 'failed' | 'idle';
  depends_on?: string[];
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

interface WorkflowDesignerProps {
  workflow?: any;
  onSave?: (workflow: any) => void;
  onRun?: (workflow: any) => void;
  readOnly?: boolean;
}

const NODE_TYPES = [
  {
    type: 'extract',
    name: 'Extract Data',
    icon: Database,
    color: 'bg-blue-500',
    description: 'Extract data from various sources'
  },
  {
    type: 'transform',
    name: 'Transform Data',
    icon: Zap,
    color: 'bg-yellow-500',
    description: 'Transform and process data'
  },
  {
    type: 'load',
    name: 'Load Data',
    icon: Database,
    color: 'bg-green-500',
    description: 'Load data to target systems'
  },
  {
    type: 'ai',
    name: 'AI Processing',
    icon: Bot,
    color: 'bg-purple-500',
    description: 'AI-powered data processing'
  },
  {
    type: 'ml',
    name: 'ML Model',
    icon: Cpu,
    color: 'bg-indigo-500',
    description: 'Machine learning predictions'
  },
  {
    type: 'notification',
    name: 'Notification',
    icon: Mail,
    color: 'bg-orange-500',
    description: 'Send notifications and alerts'
  },
  {
    type: 'condition',
    name: 'Condition',
    icon: CheckCircle,
    color: 'bg-gray-500',
    description: 'Conditional logic and branching'
  }
];

export default function WorkflowDesigner({ workflow, onSave, onRun, readOnly = false }: WorkflowDesignerProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.steps || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow?.connections || []);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });

  const handleNodeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - canvasPosition.x;
    const y = e.clientY - rect.top - canvasPosition.y;
    
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: draggedNode.type,
      name: draggedNode.name,
      description: draggedNode.description,
      position: { x, y },
      config: getDefaultConfig(draggedNode.type)
    };
    
    setNodes(prev => [...prev, newNode]);
    setDraggedNode(null);
  }, [draggedNode, canvasPosition]);

  const connectNodes = useCallback((fromNodeId: string, toNodeId: string) => {
    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      from: fromNodeId,
      to: toNodeId
    };
    
    setConnections(prev => [...prev, newConnection]);
    
    setNodes(prev => prev.map(node => 
      node.id === toNodeId 
        ? { ...node, depends_on: [...(node.depends_on || []), fromNodeId] }
        : node
    ));
  }, []);

  const handleNodeClick = useCallback((node: WorkflowNode) => {
    setSelectedNode(node);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, config } : node
    ));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const runWorkflow = useCallback(async () => {
    if (!onRun || nodes.length === 0) return;
    
    setIsRunning(true);
    
    const workflowData = {
      id: workflow?.id,
      steps: nodes,
      connections,
      status: 'running'
    };
    
    try {
      await onRun(workflowData);
    } catch (error) {
      console.error('Failed to run workflow:', error);
    } finally {
      setIsRunning(false);
    }
  }, [nodes, connections, onRun, workflow]);

  const saveWorkflow = useCallback(async () => {
    if (!onSave || nodes.length === 0) return;
    
    const workflowData = {
      id: workflow?.id,
      name: workflow?.name || 'New Workflow',
      steps: nodes,
      connections,
      updated_at: new Date().toISOString()
    };
    
    try {
      await onSave(workflowData);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }, [nodes, connections, onSave, workflow]);

  const getAISuggestions = useCallback(async () => {
    if (nodes.length === 0) return;
    
    try {
      const response = await fetch('/api/ai/workflow-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: { steps: nodes, connections },
          user_prompt: 'optimize this workflow',
          context: { existing_nodes: nodes.length }
        })
      });
      
      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  }, [nodes, connections]);

  const exportWorkflow = useCallback(() => {
    const workflowData = {
      steps: nodes,
      connections,
      metadata: {
        exported_at: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow?.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, connections, workflow]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Node Types */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Workflow Steps</h3>
          <p className="text-sm text-gray-600">Drag steps to the canvas to build your workflow</p>
        </div>
        
        <div className="space-y-2">
          {NODE_TYPES.map((nodeType) => {
            const IconComponent = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                draggable={!readOnly}
                onDragStart={() => setDraggedNode(nodeType)}
                className={`p-3 rounded-lg border-2 border-dashed border-gray-300 cursor-move hover:border-gray-400 transition-colors ${
                  readOnly ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded ${nodeType.color} text-white`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{nodeType.name}</div>
                    <div className="text-xs text-gray-500">{nodeType.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* AI Suggestions Panel */}
        {aiSuggestions.length > 0 && (
          <div className="mt-6 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-purple-900">AI Suggestions</h4>
            </div>
            <div className="space-y-2">
              {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="p-2 bg-white rounded border border-purple-200">
                  <div className="text-xs font-medium text-purple-900">{suggestion.title}</div>
                  <div className="text-xs text-purple-700">{suggestion.description}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">
                {workflow?.name || 'Untitled Workflow'}
              </h2>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isRunning ? 'Running' : 'Draft'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={getAISuggestions}
                disabled={nodes.length === 0}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
              >
                <Bot className="w-4 h-4 mr-1 inline" />
                AI Optimize
              </button>
              
              <button
                onClick={exportWorkflow}
                disabled={nodes.length === 0}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-1 inline" />
                Export
              </button>
              
              <button
                onClick={saveWorkflow}
                disabled={readOnly}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Save
              </button>
              
              <button
                onClick={runWorkflow}
                disabled={readOnly || nodes.length === 0 || isRunning}
                className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isRunning ? (
                  <Square className="w-4 h-4 mr-1 inline" />
                ) : (
                  <Play className="w-4 h-4 mr-1 inline" />
                )}
                {isRunning ? 'Stop' : 'Run'}
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onDrop={handleNodeDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map((connection) => (
                <WorkflowConnectionLine
                  key={connection.id}
                  connection={connection}
                  nodes={nodes}
                />
              ))}
            </svg>
            
            {nodes.map((node) => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onClick={() => handleNodeClick(node)}
                onUpdate={(config) => updateNodeConfig(node.id, config)}
                onDelete={() => deleteNode(node.id)}
                onConnect={(toNodeId) => connectNodes(node.id, toNodeId)}
                readOnly={readOnly}
              />
            ))}
            
            {/* Canvas Instructions */}
            {nodes.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Start Building Your Workflow</h3>
                  <p className="text-sm">
                    Drag steps from the left panel to create your ETL pipeline
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Configuration */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <WorkflowConfigPanel
            node={selectedNode}
            onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}

// Workflow Node Component
function WorkflowNodeComponent({ 
  node, 
  isSelected, 
  onClick, 
  onUpdate, 
  onDelete, 
  onConnect,
  readOnly 
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onClick: () => void;
  onUpdate: (config: any) => void;
  onDelete: () => void;
  onConnect: (toNodeId: string) => void;
  readOnly: boolean;
}) {
  const nodeType = NODE_TYPES.find(nt => nt.type === node.type);
  const IconComponent = nodeType?.icon || Database;
  
  return (
    <div
      className={`absolute p-3 min-w-[150px] cursor-pointer transition-all border rounded-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${node.status === 'running' ? 'bg-blue-50' : 'bg-white'}`}
      style={{
        left: node.position.x,
        top: node.position.y
      }}
      onClick={onClick}
    >
      <div className="flex items-start space-x-2">
        <div className={`p-1 rounded ${nodeType?.color || 'bg-gray-500'} text-white`}>
          <IconComponent className="w-3 h-3" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{node.name}</div>
          {node.description && (
            <div className="text-xs text-gray-500 truncate">{node.description}</div>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex flex-col space-y-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      {node.status && (
        <div className="mt-2">
          <span className={`px-2 py-1 text-xs rounded ${
            node.status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {node.status}
          </span>
        </div>
      )}
    </div>
  );
}

// Workflow Connection Line Component
function WorkflowConnectionLine({ connection, nodes }: { connection: WorkflowConnection; nodes: WorkflowNode[] }) {
  const fromNode = nodes.find(n => n.id === connection.from);
  const toNode = nodes.find(n => n.id === connection.to);
  
  if (!fromNode || !toNode) return null;
  
  const fromX = fromNode.position.x + 75;
  const fromY = fromNode.position.y + 25;
  const toX = toNode.position.x;
  const toY = toNode.position.y + 25;
  
  const midX = fromX + (toX - fromX) / 2;
  
  return (
    <g>
      <path
        d={`M ${fromX} ${fromY} Q ${midX} ${fromY} ${midX} ${fromY + 20} T ${toX} ${toY}`}
        stroke="#6B7280"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6B7280"
          />
        </marker>
      </defs>
    </g>
  );
}

// Workflow Configuration Panel
function WorkflowConfigPanel({ 
  node, 
  onUpdate, 
  onClose 
}: { 
  node: WorkflowNode; 
  onUpdate: (config: any) => void; 
  onClose: () => void; 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Step Configuration</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate({ ...node.config, name: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={node.description || ''}
            onChange={(e) => onUpdate({ ...node.config, description: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Timeout (minutes)</label>
          <input
            type="number"
            value={node.config?.timeout || 30}
            onChange={(e) => onUpdate({ ...node.config, timeout: parseInt(e.target.value) })}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        {/* Dynamic config based on node type */}
        {node.type === 'extract' && (
          <div>
            <label className="text-sm font-medium">Source Type</label>
            <select
              value={node.config?.source_type || 'database'}
              onChange={(e) => onUpdate({ ...node.config, source_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="file">File</option>
              <option value="stream">Stream</option>
            </select>
          </div>
        )}
        
        {node.type === 'ai' && (
          <div>
            <label className="text-sm font-medium">AI Model</label>
            <select
              value={node.config?.model || 'data_quality_assessor'}
              onChange={(e) => onUpdate({ ...node.config, model: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="data_quality_assessor">Data Quality Assessor</option>
              <option value="outlier_detector">Outlier Detector</option>
              <option value="anomaly_detector">Anomaly Detector</option>
              <option value="feature_generator">Feature Generator</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function getDefaultConfig(nodeType: string): any {
  const configs = {
    extract: { source_type: 'database', batch_size: 1000 },
    transform: { operations: [], validation_rules: [] },
    load: { target_type: 'database', mode: 'append' },
    ai: { model: 'data_quality_assessor', confidence_threshold: 0.85 },
    ml: { algorithm: 'random_forest', target: '' },
    notification: { channels: ['email'], template: 'default' },
    condition: { conditions: [], action: 'continue' }
  };
  
  return configs[nodeType as keyof typeof configs] || {};
}