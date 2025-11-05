import { Server } from 'socket.io';
import { db } from './db';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join room for real-time updates
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      console.log(`Socket ${socket.id} joined dashboard room`);
    });

    // Join job-specific room for job updates
    socket.on('join-job', (jobId: string) => {
      socket.join(`job-${jobId}`);
      console.log(`Socket ${socket.id} joined job room for ${jobId}`);
    });

    // Handle job execution requests
    socket.on('run-job', async (jobId: string) => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/run`, {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          socket.emit('job-started', { jobId, executionId: data.executionId });
          
          // Broadcast to dashboard
          io.to('dashboard').emit('job-status-update', {
            jobId,
            status: 'running',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        socket.emit('job-error', { jobId, error: 'Failed to start job' });
      }
    });

    // Handle real-time log requests
    socket.on('subscribe-logs', (filters?: { jobId?: string; level?: string }) => {
      socket.join('logs');
      
      // Send recent logs
      const getRecentLogs = async () => {
        try {
          // For now, send empty logs until database is properly migrated
          socket.emit('logs-data', []);
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      };
      
      getRecentLogs();
    });

    // Handle system stats requests
    socket.on('get-stats', async () => {
      try {
        // For now, return static stats until database is properly migrated
        const stats = {
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          totalDataSources: 0,
          successRate: 0
        };

        socket.emit('stats-data', stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send initial connection message
    socket.emit('connected', {
      message: 'Connected to ETL Real-time Server',
      timestamp: new Date().toISOString()
    });
  });
};

// Helper functions to broadcast updates
export const broadcastJobUpdate = (io: Server, jobId: string, update: any) => {
  io.to(`job-${jobId}`).emit('job-update', { jobId, ...update });
  io.to('dashboard').emit('job-status-update', { jobId, ...update });
};

export const broadcastLog = (io: Server, log: any) => {
  io.to('logs').emit('new-log', log);
};

export const broadcastSystemAlert = (io: Server, alert: any) => {
  io.to('dashboard').emit('system-alert', alert);
};