import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, channels, userRole } = body

    // Get users based on role (if specified)
    let users
    if (userRole) {
      users = await db.user.findMany({
        where: { role: userRole }
      })
    } else {
      users = await db.user.findMany({
        where: {
          settings: {
            emailNotifications: true
          }
        }
      })
    }

    // Create notifications for all users
    const notifications = await Promise.all(
      users.map(async (user) => {
        return await db.notification.create({
          data: {
            userId: user.id,
            type,
            title,
            message,
            channels: JSON.stringify(channels || ['IN_APP'])
          }
        })
      })
    )

    // Send notifications through different channels
    for (const user of users) {
      const userSettings = await db.userSettings.findUnique({
        where: { userId: user.id }
      })

      if (channels?.includes('EMAIL') && userSettings?.emailNotifications) {
        // Send email (implementation would go here)
        console.log(`Broadcast email to ${user.email}: ${title}`)
      }

      if (channels?.includes('TELEGRAM') && userSettings?.telegramNotifications && userSettings.telegramChatId) {
        // Send Telegram message (implementation would go here)
        console.log(`Broadcast Telegram to ${userSettings.telegramChatId}: ${title}`)
      }
    }

    return NextResponse.json({
      message: `Broadcast sent to ${users.length} users`,
      notifications: notifications.length
    })
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json(
      { error: 'Failed to send broadcast' },
      { status: 500 }
    )
  }
}