import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const jobs = await db.eTLJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        source: {
          select: { name: true, type: true }
        },
        target: {
          select: { name: true, type: true }
        },
        creator: {
          select: { name: true, email: true }
        },
        _count: {
          select: { executions: true }
        }
      }
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      sourceId, 
      targetId, 
      query, 
      transformRules, 
      schedule, 
      createdBy 
    } = body

    if (!name || !sourceId || !targetId || !createdBy) {
      return NextResponse.json(
        { error: 'Name, source, target, and creator are required' },
        { status: 400 }
      )
    }

    // Validate source and target exist
    const source = await db.dataSource.findUnique({ where: { id: sourceId } })
    const target = await db.dataSource.findUnique({ where: { id: targetId } })
    const creator = await db.user.findUnique({ where: { id: createdBy } })

    if (!source || !target || !creator) {
      return NextResponse.json(
        { error: 'Invalid source, target, or creator' },
        { status: 400 }
      )
    }

    // Calculate next run time if schedule is provided
    let nextRun = null
    if (schedule) {
      // Simple cron parsing for demo - in production, use a proper cron library
      const now = new Date()
      nextRun = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    }

    const job = await db.eTLJob.create({
      data: {
        name,
        description,
        sourceId,
        targetId,
        query,
        transformRules,
        schedule,
        nextRun,
        createdBy
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

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}