import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dataSource = await db.dataSource.findUnique({
      where: { id: params.id },
      include: {
        jobs: {
          include: {
            creator: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: { jobs: true, syncLogs: true }
        }
      }
    })

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(dataSource)
  } catch (error) {
    console.error('Error fetching data source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data source' },
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
    const { name, type, connectionString, description, isActive } = body

    const dataSource = await db.dataSource.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(connectionString && { connectionString }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(dataSource)
  } catch (error) {
    console.error('Error updating data source:', error)
    return NextResponse.json(
      { error: 'Failed to update data source' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if data source is being used by any active jobs
    const activeJobs = await db.eTLJob.findMany({
      where: {
        OR: [
          { sourceId: params.id },
          { targetId: params.id }
        ],
        isActive: true
      }
    })

    if (activeJobs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete data source: it is being used by active jobs' },
        { status: 400 }
      )
    }

    await db.dataSource.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Data source deleted successfully' })
  } catch (error) {
    console.error('Error deleting data source:', error)
    return NextResponse.json(
      { error: 'Failed to delete data source' },
      { status: 500 }
    )
  }
}