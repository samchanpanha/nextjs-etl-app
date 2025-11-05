import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 50 // Last 50 executions
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Transform the data for frontend compatibility
    const transformedWorkflow = {
      ...workflow,
      steps: workflow.steps ? JSON.parse(workflow.steps) : [],
      connections: workflow.connections ? JSON.parse(workflow.connections) : [],
      trigger: workflow.trigger ? JSON.parse(workflow.trigger) : null,
      resources: workflow.resources ? JSON.parse(workflow.resources) : null,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      executions: workflow.executions.map(execution => ({
        ...execution,
        metrics: execution.metrics ? JSON.parse(execution.metrics) : null,
        logs: execution.logs ? JSON.parse(execution.logs) : []
      })),
      creator: undefined // Remove creator from response
    };

    return NextResponse.json({
      workflow: transformedWorkflow
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const workflowData = await request.json();

    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: workflowData.name,
        description: workflowData.description,
        status: workflowData.status,
        steps: workflowData.steps ? JSON.stringify(workflowData.steps) : null,
        connections: workflowData.connections ? JSON.stringify(workflowData.connections) : null,
        trigger: workflowData.trigger ? JSON.stringify(workflowData.trigger) : null,
        resources: workflowData.resources ? JSON.stringify(workflowData.resources) : null,
        tags: workflowData.tags ? JSON.stringify(workflowData.tags) : null,
        updatedAt: new Date()
      },
      include: {
        executions: {
          take: 1,
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      workflow: {
        ...updatedWorkflow,
        steps: updatedWorkflow.steps ? JSON.parse(updatedWorkflow.steps) : [],
        connections: updatedWorkflow.connections ? JSON.parse(updatedWorkflow.connections) : [],
        trigger: updatedWorkflow.trigger ? JSON.parse(updatedWorkflow.trigger) : null,
        resources: updatedWorkflow.resources ? JSON.parse(updatedWorkflow.resources) : null,
        tags: updatedWorkflow.tags ? JSON.parse(updatedWorkflow.tags) : [],
        executions: undefined
      }
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;

    // Delete all executions first
    await prisma.workflowExecution.deleteMany({
      where: { workflowId }
    });

    // Delete the workflow
    await prisma.workflow.delete({
      where: { id: workflowId }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}