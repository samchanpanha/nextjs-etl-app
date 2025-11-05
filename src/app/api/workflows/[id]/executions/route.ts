import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    const total = await prisma.workflowExecution.count({
      where: { workflowId }
    });

    // Transform data for frontend
    const transformedExecutions = executions.map(execution => ({
      ...execution,
      metrics: execution.metrics ? JSON.parse(execution.metrics) : null,
      logs: execution.logs ? JSON.parse(execution.logs) : [],
      workflow: undefined // Remove workflow from response
    }));

    return NextResponse.json({
      executions: transformedExecutions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    
    // Get workflow details
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Parse workflow configuration
    const workflowSteps = workflow.steps ? JSON.parse(workflow.steps) : [];
    
    if (!Array.isArray(workflowSteps) || workflowSteps.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no valid steps to execute' },
        { status: 400 }
      );
    }

    // Create workflow execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflowId,
        status: 'RUNNING',
        startedAt: new Date(),
        totalSteps: workflowSteps.length,
        completedSteps: 0,
        progress: 0,
        logs: JSON.stringify([]),
        metrics: JSON.stringify({
          duration: 0,
          records_processed: 0,
          memory_usage: 0,
          cpu_usage: 0
        })
      }
    });

    // Start workflow execution (simulate async execution)
    executeWorkflowAsync(execution.id, workflowSteps);

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      message: 'Workflow execution started'
    });

  } catch (error) {
    console.error('Error starting workflow execution:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow execution' },
      { status: 500 }
    );
  }
}

// Simulate async workflow execution
async function executeWorkflowAsync(executionId: string, steps: any[]) {
  try {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true }
    });

    if (!execution) return;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Update current step
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          currentStep: step.name || step.id,
          completedSteps: i,
          progress: Math.round(((i + 1) / steps.length) * 100)
        }
      });

      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds per step

      // Update logs
      const currentLogs = execution.logs ? JSON.parse(execution.logs) : [];
      currentLogs.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Executed step: ${step.name || step.id}`,
        stepId: step.id,
        stepName: step.name || step.id
      });

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          logs: JSON.stringify(currentLogs),
          metrics: JSON.stringify({
            duration: (i + 1) * 2, // 2 minutes per step
            records_processed: (i + 1) * 1000,
            memory_usage: 1 + (i * 0.5),
            cpu_usage: 30 + (i * 10)
          })
        }
      });
    }

    // Mark execution as completed
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progress: 100,
        completedSteps: steps.length,
        currentStep: null
      }
    });

  } catch (error) {
    console.error('Error in workflow execution:', error);
    
    // Mark execution as failed
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    });
  }
}