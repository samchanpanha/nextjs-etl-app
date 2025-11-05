import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dataSources = await db.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    })

    return NextResponse.json(dataSources)
  } catch (error) {
    console.error('Error fetching data sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, connectionString, description } = body

    if (!name || !type || !connectionString) {
      return NextResponse.json(
        { error: 'Name, type, and connection string are required' },
        { status: 400 }
      )
    }

    // Validate connection string based on type
    let isValidConnection = false
    try {
      switch (type) {
        case 'MYSQL':
        case 'POSTGRESQL':
          // Basic validation for database URLs
          isValidConnection = connectionString.includes('://') && 
                            (connectionString.includes('mysql') || connectionString.includes('postgresql'))
          break
        case 'API':
          // Basic validation for API URLs
          isValidConnection = connectionString.startsWith('http://') || 
                            connectionString.startsWith('https://')
          break
        case 'CSV':
        case 'JSON':
        case 'EXCEL':
          // File path validation
          isValidConnection = connectionString.length > 0
          break
        default:
          isValidConnection = true
      }
    } catch (error) {
      isValidConnection = false
    }

    if (!isValidConnection) {
      return NextResponse.json(
        { error: 'Invalid connection string for the selected type' },
        { status: 400 }
      )
    }

    const dataSource = await db.dataSource.create({
      data: {
        name,
        type,
        connectionString,
        description
      }
    })

    return NextResponse.json(dataSource, { status: 201 })
  } catch (error) {
    console.error('Error creating data source:', error)
    return NextResponse.json(
      { error: 'Failed to create data source' },
      { status: 500 }
    )
  }
}