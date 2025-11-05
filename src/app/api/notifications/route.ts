import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, channels } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'User ID, type, title, and message are required' },
        { status: 400 }
      )
    }

    // Create notification record
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        channels: JSON.stringify(channels || ['IN_APP'])
      }
    })

    // Send notifications through different channels
    const usedChannels: string[] = []

    // In-app notification (already stored in database)
    usedChannels.push('IN_APP')

    // Email notification
    if (channels?.includes('EMAIL')) {
      await sendEmailNotification(userId, title, message)
      usedChannels.push('EMAIL')
    }

    // Telegram notification
    if (channels?.includes('TELEGRAM')) {
      await sendTelegramNotification(userId, title, message)
      usedChannels.push('TELEGRAM')
    }

    // Update notification with used channels
    await db.notification.update({
      where: { id: notification.id },
      data: { channels: JSON.stringify(usedChannels) }
    })

    return NextResponse.json({ 
      ...notification, 
      channels: JSON.stringify(usedChannels)
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

async function sendEmailNotification(userId: string, title: string, message: string) {
  try {
    // Get user settings
    const userSettings = await db.userSettings.findUnique({
      where: { userId }
    })

    if (!userSettings?.emailNotifications) {
      return
    }

    // Get user email
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user?.email) {
      return
    }

    // Send email using ZAI or email service
    const zai = await ZAI.create()
    
    // This is a mock email sending - in production, you'd use a real email service
    console.log(`Sending email to ${user.email}: ${title} - ${message}`)
    
    // You could use ZAI to generate a nice email template
    const emailContent = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an email template generator. Create a professional email notification.'
        },
        {
          role: 'user',
          content: `Create an email with subject: ${title} and body: ${message}`
        }
      ]
    })

    console.log('Generated email content:', emailContent.choices[0]?.message?.content)
  } catch (error) {
    console.error('Error sending email notification:', error)
  }
}

async function sendTelegramNotification(userId: string, title: string, message: string) {
  try {
    // Get user settings
    const userSettings = await db.userSettings.findUnique({
      where: { userId }
    })

    if (!userSettings?.telegramNotifications || !userSettings.telegramChatId) {
      return
    }

    // Send Telegram message
    const telegramMessage = `*${title}*\n\n${message}`
    
    // In production, you'd use Telegram Bot API
    console.log(`Sending Telegram message to ${userSettings.telegramChatId}: ${telegramMessage}`)
    
    // Mock Telegram API call
    // const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     chat_id: userSettings.telegramChatId,
    //     text: telegramMessage,
    //     parse_mode: 'Markdown'
    //   })
    // })
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}