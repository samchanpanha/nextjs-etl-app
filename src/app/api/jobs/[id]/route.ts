import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await db.eTLJob.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        target: true,
        creator: {
          select: { name: true, email: true }
        },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10
        },
        syncLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, query, transformRules, schedule, isActive } = body

    const job = await db.eTLJob.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(query !== undefined && { query }),
        ...(transformRules !== undefined && { transformRules }),
        ...(schedule !== undefined && { schedule }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        source: {
          select: { name: true, type: true }
        },
        target: {
          select: { name: true, type: true }
        },
        creator: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.eTLJob.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}