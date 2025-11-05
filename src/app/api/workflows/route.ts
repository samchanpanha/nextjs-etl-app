import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = status ? { status: status.toUpperCase() } : {};
    
    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        executions: {
          take: 1,
          orderBy: { startedAt: 'desc' }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    const total = await prisma.workflow.count({ where });

    // Transform the data for frontend compatibility
    const transformedWorkflows = workflows.map(workflow => ({
      ...workflow,
      last_execution: workflow.executions[0] || null,
      createdJobs: undefined, // Remove executions from parent
      executions: undefined // Remove executions array
    }));

    return NextResponse.json({
      workflows: transformedWorkflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const workflowData = await request.json();
    
    // Validate required fields
    if (!workflowData.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Get user ID from auth context (for now, use a default user)
    const createdBy = 'default-user-id'; // In real app, get from auth

    const newWorkflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description || '',
        version: '1.0.0',
        status: 'DRAFT',
        tags: workflowData.tags ? JSON.stringify(workflowData.tags) : null,
        createdBy,
        steps: workflowData.steps ? JSON.stringify(workflowData.steps) : null,
        connections: workflowData.connections ? JSON.stringify(workflowData.connections) : null,
        trigger: workflowData.trigger ? JSON.stringify(workflowData.trigger) : null,
        resources: workflowData.resources ? JSON.stringify(workflowData.resources) : null
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Transform for frontend
    const transformedWorkflow = {
      ...newWorkflow,
      createdJobs: undefined
    };

    return NextResponse.json({
      success: true,
      workflow: transformedWorkflow
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}