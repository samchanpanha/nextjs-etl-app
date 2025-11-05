'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const socketInstance = io({
      autoConnect: options.autoConnect ?? true,
      reconnection: options.reconnection ?? true,
      reconnectionAttempts: options.reconnectionAttempts ?? 5,
      reconnectionDelay: options.reconnectionDelay ?? 1000,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to socket server')
      setIsConnected(true)
      setError(null)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
      setError(err.message)
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const joinDashboard = () => {
    socket?.emit('join-dashboard')
  }

  const joinJob = (jobId: string) => {
    socket?.emit('join-job', jobId)
  }

  const runJob = (jobId: string) => {
    socket?.emit('run-job', jobId)
  }

  const subscribeToLogs = (filters?: { jobId?: string; level?: string }) => {
    socket?.emit('subscribe-logs', filters)
  }

  const getStats = () => {
    socket?.emit('get-stats')
  }

  return {
    socket,
    isConnected,
    error,
    joinDashboard,
    joinJob,
    runJob,
    subscribeToLogs,
    getStats,
  }
}

export const useSocketListener = <T = any>(
  socket: Socket | null,
  event: string,
  callback: (data: T) => void,
  deps: any[] = []
) => {
  useEffect(() => {
    if (!socket) return

    const handler = callback
    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, ...deps])
}