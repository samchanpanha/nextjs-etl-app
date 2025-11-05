/**
 * 🧪 Sample Data Setup Script for ETL System
 * 
 * This script creates comprehensive sample data for testing and demonstration
 * including users, data sources, ETL jobs, workflows, and historical data.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

class SampleDataSetup {
  constructor() {
    this.users = [];
    this.dataSources = [];
    this.jobs = [];
    this.workflows = [];
  }

  async setup() {
    try {
      console.log('🚀 Starting sample data setup...');
      
      // Create users
      await this.createUsers();
      
      // Create data sources
      await this.createDataSources();
      
      // Create ETL jobs
      await this.createETLJobs();
      
      // Create workflows
      await this.createWorkflows();
      
      // Create executions and history
      await this.createExecutionHistory();
      
      // Create notifications
      await this.createSampleNotifications();
      
      // Configure system settings
      await this.setupSystemSettings();
      
      console.log('✅ Sample data setup completed successfully!');
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ Sample data setup failed:', error);
      throw error;
    }
  }

  async createUsers() {
    console.log('👥 Creating users...');
    
    const users = [
      {
        email: 'admin@etl-demo.com',
        name: 'System Administrator',
        role: 'ADMIN'
      },
      {
        email: 'data-engineer@etl-demo.com',
        name: 'Jane Data Engineer',
        role: 'USER'
      },
      {
        email: 'analyst@etl-demo.com',
        name: 'Bob Data Analyst',
        role: 'USER'
      },
      {
        email: 'viewer@etl-demo.com',
        name: 'Alice Viewer',
        role: 'VIEWER'
      }
    ];

    for (const userData of users) {
      const user = await prisma.user.create({
        data: userData
      });
      
      // Create user settings
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          theme: userData.role === 'ADMIN' ? 'dark' : 'light',
          language: 'en',
          emailNotifications: true,
          telegramNotifications: userData.role === 'ADMIN'
        }
      });
      
      this.users.push(user);
      console.log(`  ✅ Created user: ${user.email}`);
    }
  }

  async createDataSources() {
    console.log('🗄️ Creating data sources...');
    
    const dataSources = [
      {
        name: 'Sales Database',
        type: 'SQLITE',
        connectionString: './sample-data/sales.db',
        description: 'Main sales transaction database',
        isActive: true
      },
      {
        name: 'Customer Data (CSV)',
        type: 'CSV',
        connectionString: './sample-data/customers.csv',
        description: 'Customer information from CRM export',
        isActive: true
      },
      {
        name: 'Product Catalog API',
        type: 'API',
        connectionString: 'https://api.store.com/products',
        description: 'REST API for product information',
        isActive: true
      },
      {
        name: 'Analytics Database',
        type: 'POSTGRESQL',
        connectionString: 'postgresql://user:pass@analytics-db:5432/analytics',
        description: 'Data warehouse for analytics',
        isActive: true
      },
      {
        name: 'Inventory JSON Feed',
        type: 'JSON',
        connectionString: './sample-data/inventory.json',
        description: 'Real-time inventory updates',
        isActive: true
      },
      {
        name: 'Employee Excel Report',
        type: 'EXCEL',
        connectionString: './sample-data/employees.xlsx',
        description: 'Monthly employee performance report',
        isActive: true
      }
    ];

    for (const sourceData of dataSources) {
      const source = await prisma.dataSource.create({
        data: {
          ...sourceData,
          lastSynced: new Date(Date.now() - Math.random() * 86400000 * 7) // Random sync time within last week
        }
      });
      
      this.dataSources.push(source);
      console.log(`  ✅ Created data source: ${source.name}`);
    }
  }

  async createETLJobs() {
    console.log('⚙️ Creating ETL jobs...');
    
    const salesDb = this.dataSources.find(ds => ds.name === 'Sales Database');
    const customerCsv = this.dataSources.find(ds => ds.name === 'Customer Data (CSV)');
    const analyticsDb = this.dataSources.find(ds => ds.name === 'Analytics Database');
    
    if (!salesDb || !customerCsv || !analyticsDb) {
      throw new Error('Required data sources not found');
    }

    const jobs = [
      {
        name: 'Daily Sales Sync',
        description: 'Sync daily sales transactions from sales database to analytics',
        sourceId: salesDb.id,
        targetId: analyticsDb.id,
        query: 'SELECT * FROM sales WHERE date >= date("now", "-1 day")',
        transformRules: JSON.stringify({
          currency: 'USD',
          tax_rate: 0.08,
          date_format: 'ISO8601'
        }),
        schedule: '0 2 * * *', // Daily at 2 AM
        isActive: true,
        status: 'ACTIVE',
        createdBy: this.users[0].id // Admin
      },
      {
        name: 'Customer Enrichment',
        description: 'Enrich sales data with customer information',
        sourceId: customerCsv.id,
        targetId: analyticsDb.id,
        query: 'SELECT customer_id, name, email, segment FROM customers',
        transformRules: JSON.stringify({
          email_validation: true,
          segment_mapping: {
            'high_value': 'VIP',
            'regular': 'Standard',
            'new': 'New'
          }
        }),
        schedule: '0 3 * * 1', // Weekly on Monday at 3 AM
        isActive: true,
        status: 'ACTIVE',
        createdBy: this.users[1].id // Data engineer
      },
      {
        name: 'Hourly Product Sync',
        description: 'Update product catalog from API',
        sourceId: this.dataSources.find(ds => ds.name === 'Product Catalog API').id,
        targetId: analyticsDb.id,
        query: null,
        transformRules: JSON.stringify({
          api_timeout: 30,
          retry_attempts: 3,
          price_conversion: 'USD'
        }),
        schedule: '0 * * * *', // Every hour
        isActive: false, // Paused for demo
        status: 'PAUSED',
        createdBy: this.users[1].id
      }
    ];

    for (const jobData of jobs) {
      const job = await prisma.eTLJob.create({
        data: jobData
      });
      
      this.jobs.push(job);
      console.log(`  ✅ Created ETL job: ${job.name}`);
    }
  }

  async createWorkflows() {
    console.log('🔄 Creating workflows...');
    
    const admin = this.users[0];
    
    const workflows = [
      {
        name: 'Daily Data Processing Pipeline',
        description: 'End-to-end daily data processing with validation and reporting',
        version: '1.0.0',
        status: 'ACTIVE',
        tags: JSON.stringify(['daily', 'production', 'critical']),
        createdBy: admin.id,
        steps: JSON.stringify([
          {
            id: 'step-1',
            name: 'Data Validation',
            type: 'validation',
            config: { required_fields: ['customer_id', 'amount'], null_check: true }
          },
          {
            id: 'step-2', 
            name: 'Data Transformation',
            type: 'transform',
            config: { currency_conversion: true, data_cleansing: true }
          },
          {
            id: 'step-3',
            name: 'Quality Check',
            type: 'quality',
            config: { duplicate_check: true, range_validation: true }
          },
          {
            id: 'step-4',
            name: 'Load to Warehouse',
            type: 'load',
            config: { batch_size: 1000, rollback_on_error: true }
          }
        ]),
        connections: JSON.stringify([
          { from: 'step-1', to: 'step-2', condition: 'success' },
          { from: 'step-2', to: 'step-3', condition: 'success' },
          { from: 'step-3', to: 'step-4', condition: 'success' }
        ]),
        trigger: JSON.stringify({
          type: 'schedule',
          cron: '0 2 * * *',
          timezone: 'UTC'
        }),
        resources: JSON.stringify({
          cpu_limit: '2',
          memory_limit: '4GB',
          timeout: '2h'
        })
      },
      {
        name: 'Real-time Customer Data Sync',
        description: 'Continuous customer data synchronization with error handling',
        version: '2.1.0',
        status: 'ACTIVE',
        tags: JSON.stringify(['real-time', 'customer', 'critical']),
        createdBy: this.users[1].id,
        steps: JSON.stringify([
          {
            id: 'rt-step-1',
            name: 'Change Detection',
            type: 'detect',
            config: { method: 'timestamp', checkpoint_table: 'sync_checkpoint' }
          },
          {
            id: 'rt-step-2',
            name: 'Data Fetch',
            type: 'fetch',
            config: { batch_size: 500, parallel_requests: 5 }
          },
          {
            id: 'rt-step-3',
            name: 'Transform & Validate',
            type: 'transform',
            config: { validation_rules: ['email_format', 'phone_format'], transformation: 'standardize' }
          },
          {
            id: 'rt-step-4',
            name: 'Batch Load',
            type: 'load',
            config: { commit_interval: '100', index_after_load: true }
          }
        ]),
        connections: JSON.stringify([
          { from: 'rt-step-1', to: 'rt-step-2', condition: 'changes_found' },
          { from: 'rt-step-2', to: 'rt-step-3', condition: 'success' },
          { from: 'rt-step-3', to: 'rt-step-4', condition: 'validation_passed' }
        ]),
        trigger: JSON.stringify({
          type: 'interval',
          interval: 300, // 5 minutes
          max_runtime: 1800 // 30 minutes
        }),
        resources: JSON.stringify({
          cpu_limit: '4',
          memory_limit: '8GB',
          timeout: '30m'
        })
      }
    ];

    for (const workflowData of workflows) {
      const workflow = await prisma.workflow.create({
        data: workflowData
      });
      
      this.workflows.push(workflow);
      console.log(`  ✅ Created workflow: ${workflow.name}`);
    }
  }

  async createExecutionHistory() {
    console.log('📊 Creating execution history...');
    
    // Create job executions with realistic history
    for (const job of this.jobs) {
      const executionCount = Math.floor(Math.random() * 10) + 5; // 5-15 executions
      
      for (let i = 0; i < executionCount; i++) {
        const startTime = new Date(Date.now() - Math.random() * 86400000 * 30); // Within last 30 days
        const duration = Math.floor(Math.random() * 3600000) + 60000; // 1-60 minutes
        const completedTime = new Date(startTime.getTime() + duration);
        
        const status = Math.random() > 0.1 ? 'COMPLETED' : 'FAILED'; // 90% success rate
        const recordsProcessed = Math.floor(Math.random() * 10000) + 1000;
        const recordsSuccess = status === 'COMPLETED' ? Math.floor(recordsProcessed * (0.95 + Math.random() * 0.05)) : 0;
        const recordsFailed = recordsProcessed - recordsSuccess;
        
        await prisma.jobExecution.create({
          data: {
            jobId: job.id,
            status,
            startedAt: startTime,
            completedAt: status === 'COMPLETED' ? completedTime : null,
            recordsProcessed,
            recordsSuccess,
            recordsFailed,
            errorMessage: status === 'FAILED' ? 'Connection timeout to target database' : null,
            logs: JSON.stringify([
              { timestamp: startTime, level: 'INFO', message: 'Job started' },
              { timestamp: new Date(startTime.getTime() + 10000), level: 'INFO', message: 'Data extraction completed' },
              { timestamp: new Date(startTime.getTime() + duration - 5000), level: status === 'COMPLETED' ? 'INFO' : 'ERROR', message: status === 'COMPLETED' ? 'Job completed successfully' : 'Connection timeout' }
            ])
          }
        });
        
        // Update job lastRun
        await prisma.eTLJob.update({
          where: { id: job.id },
          data: { lastRun: completedTime }
        });
      }
    }

    // Create workflow executions
    for (const workflow of this.workflows) {
      const executionCount = Math.floor(Math.random() * 8) + 3; // 3-10 executions
      
      for (let i = 0; i < executionCount; i++) {
        const startTime = new Date(Date.now() - Math.random() * 86400000 * 7); // Within last week
        const duration = Math.floor(Math.random() * 7200000) + 300000; // 5-120 minutes
        const completedTime = new Date(startTime.getTime() + duration);
        
        const status = Math.random() > 0.15 ? 'COMPLETED' : 'FAILED'; // 85% success rate
        const totalSteps = 4;
        const completedSteps = status === 'COMPLETED' ? totalSteps : Math.floor(Math.random() * totalSteps);
        
        await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            status,
            startedAt: startTime,
            completedAt: status === 'COMPLETED' ? completedTime : null,
            progress: Math.round((completedSteps / totalSteps) * 100),
            currentStep: status === 'COMPLETED' ? null : `step-${completedSteps + 1}`,
            totalSteps,
            completedSteps,
            errorMessage: status === 'FAILED' ? 'Data validation failed on step 3' : null,
            logs: JSON.stringify([
              { timestamp: startTime, level: 'INFO', message: 'Workflow execution started', step: null },
              { timestamp: new Date(startTime.getTime() + 60000), level: 'INFO', message: 'Step 1 completed: Data Validation', step: 'step-1' },
              { timestamp: new Date(startTime.getTime() + 120000), level: 'INFO', message: 'Step 2 completed: Data Transformation', step: 'step-2' },
              ...(status === 'FAILED' 
                ? [{ timestamp: new Date(startTime.getTime() + 180000), level: 'ERROR', message: 'Step 3 failed: Quality Check - Invalid data format', step: 'step-3' }]
                : [
                    { timestamp: new Date(startTime.getTime() + 180000), level: 'INFO', message: 'Step 3 completed: Quality Check', step: 'step-3' },
                    { timestamp: new Date(startTime.getTime() + 240000), level: 'INFO', message: 'Step 4 completed: Load to Warehouse', step: 'step-4' },
                    { timestamp: completedTime, level: 'INFO', message: 'Workflow completed successfully', step: null }
                  ]
              )
            ]),
            metrics: JSON.stringify({
              totalRecords: Math.floor(Math.random() * 50000) + 10000,
              processingTime: duration,
              throughput: Math.round((recordsProcessed / (duration / 1000)) * 100) / 100,
              errorRate: status === 'FAILED' ? Math.random() * 0.1 : Math.random() * 0.02,
              resourceUsage: {
                cpu: Math.round((Math.random() * 80 + 20) * 100) / 100,
                memory: Math.round((Math.random() * 60 + 30) * 100) / 100,
                diskIO: Math.round(Math.random() * 1000) / 100
              }
            })
          }
        });
      }
    }

    // Create sync logs
    const logMessages = [
      { level: 'INFO', message: 'Connection established to data source' },
      { level: 'INFO', message: 'Schema validation completed' },
      { level: 'INFO', message: 'Data extraction started' },
      { level: 'WARN', message: 'Some records contain null values in optional fields' },
      { level: 'INFO', message: 'Data transformation applied' },
      { level: 'INFO', message: 'Quality checks passed' },
      { level: 'INFO', message: 'Data loaded to target successfully' }
    ];

    for (let i = 0; i < 50; i++) {
      const dataSource = this.dataSources[Math.floor(Math.random() * this.dataSources.length)];
      const logEntry = logMessages[Math.floor(Math.random() * logMessages.length)];
      
      await prisma.syncLog.create({
        data: {
          sourceId: dataSource.id,
          jobId: this.jobs[Math.floor(Math.random() * this.jobs.length)]?.id,
          level: logEntry.level,
          message: logEntry.message,
          details: JSON.stringify({
            records_processed: Math.floor(Math.random() * 1000) + 100,
            processing_time: Math.floor(Math.random() * 300000) + 10000,
            additional_info: 'Sample log entry for demonstration'
          }),
          timestamp: new Date(Date.now() - Math.random() * 86400000 * 7)
        }
      });
    }

    console.log('  ✅ Created job executions, workflow executions, and sync logs');
  }

  async createSampleNotifications() {
    console.log('🔔 Creating sample notifications...');
    
    const notificationTypes = [
      { type: 'JOB_SUCCESS', title: 'Job Completed Successfully', message: 'Daily Sales Sync completed with 1,247 records processed' },
      { type: 'JOB_FAILURE', title: 'Job Failed', message: 'Customer Enrichment job failed due to connection timeout' },
      { type: 'SYSTEM_ALERT', title: 'High Memory Usage', message: 'System memory usage exceeded 85% threshold' },
      { type: 'DATA_SOURCE_ERROR', title: 'Data Source Connection Issue', message: 'Unable to connect to Product Catalog API' },
      { type: 'SCHEDULE_INFO', title: 'Scheduled Job Reminder', message: 'Hourly Product Sync will run in 15 minutes' }
    ];

    for (let i = 0; i < 20; i++) {
      const notification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const user = this.users[Math.floor(Math.random() * this.users.length)];
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: Math.random() > 0.3, // 70% read rate
          channels: JSON.stringify(['IN_APP', 'EMAIL']),
          sentAt: new Date(Date.now() - Math.random() * 86400000 * 3)
        }
      });
    }

    console.log('  ✅ Created sample notifications');
  }

  async setupSystemSettings() {
    console.log('⚙️ Configuring system settings...');
    
    const settings = [
      {
        key: 'default_timezone',
        value: '"UTC"',
        description: 'Default timezone for scheduled jobs'
      },
      {
        key: 'max_concurrent_jobs',
        value: '10',
        description: 'Maximum number of concurrent ETL jobs'
      },
      {
        key: 'notification_retention_days',
        value: '30',
        description: 'Number of days to retain notifications'
      },
      {
        key: 'log_retention_days',
        value: '90',
        description: 'Number of days to retain execution logs'
      },
      {
        key: 'auto_cleanup_enabled',
        value: 'true',
        description: 'Enable automatic cleanup of old data'
      },
      {
        key: 'performance_monitoring_enabled',
        value: 'true',
        description: 'Enable performance monitoring and metrics'
      }
    ];

    for (const setting of settings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date()
        },
        create: setting
      });
      
      console.log(`  ✅ Set ${setting.key}: ${setting.value}`);
    }
  }

  async printSummary() {
    console.log('\n📋 Sample Data Summary:');
    console.log(`  👥 Users: ${this.users.length} (Admin, Data Engineer, Analyst, Viewer)`);
    console.log(`  🗄️ Data Sources: ${this.dataSources.length} (SQLite, CSV, API, PostgreSQL, JSON, Excel)`);
    console.log(`  ⚙️ ETL Jobs: ${this.jobs.length} (Daily, Weekly, Hourly schedules)`);
    console.log(`  🔄 Workflows: ${this.workflows.length} (Complex multi-step processing)`);
    console.log(`  📊 Historical Data: Job executions, workflow runs, sync logs, notifications`);
    console.log(`  ⚙️ System Settings: Optimized for testing and demonstration`);
    
    console.log('\n🎯 Ready for Testing:');
    console.log('  • User roles and permissions');
    console.log('  • Data source management');
    console.log('  • ETL job scheduling and execution');
    console.log('  • Workflow orchestration');
    console.log('  • Real-time monitoring and notifications');
    console.log('  • Performance optimization and scaling');
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new SampleDataSetup();
  
  setup.setup().then(() => {
    console.log('🎉 Sample data setup completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Sample data setup failed:', error);
    process.exit(1);
  });
}

export default SampleDataSetup;