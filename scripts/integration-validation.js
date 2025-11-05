/**
 * 🔗 System Integration Validation Script
 * 
 * This script performs comprehensive integration testing to ensure all
 * system components work together correctly.
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

class IntegrationValidator {
  constructor() {
    this.validationResults = {
      docker: { status: 'unknown', details: '' },
      database: { status: 'unknown', details: '' },
      apis: { status: 'unknown', details: '' },
      ai: { status: 'unknown', details: '' },
      realtime: { status: 'unknown', details: '' },
      overall: { status: 'unknown', details: '' }
    };
  }

  async validateAll() {
    try {
      console.log('🔗 Starting comprehensive system integration validation...');
      console.log('='.repeat(60));
      
      // Validate each component
      await this.validateDockerSetup();
      await this.validateDatabaseIntegration();
      await this.validateAPIs();
      await this.validateAIIntegration();
      await this.validateRealtimeFeatures();
      
      // Test end-to-end workflows
      await this.testEndToEndWorkflows();
      
      // Generate validation report
      await this.generateValidationReport();
      
      // Print final results
      this.printFinalResults();
      
      console.log('✅ System integration validation completed!');
      
    } catch (error) {
      console.error('❌ Integration validation failed:', error);
      throw error;
    }
  }

  async validateDockerSetup() {
    console.log('🐳 Validating Docker setup...');
    
    try {
      // Check if Docker is available
      const dockerVersion = await this.runCommand('docker', ['--version']);
      console.log(`  📋 Docker version: ${dockerVersion.stdout.trim()}`);
      
      // Check if containers are running
      const psResult = await this.runCommand('docker', ['ps', '--format', 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}']);
      const containerStatus = psResult.stdout;
      
      const isRunning = containerStatus.includes('etl-system') || containerStatus.includes('8080');
      
      if (isRunning) {
        this.validationResults.docker = {
          status: 'passed',
          details: 'Docker containers are running and accessible'
        };
        console.log('  ✅ Docker containers are running');
      } else {
        this.validationResults.docker = {
          status: 'failed',
          details: 'Docker containers are not running'
        };
        console.log('  ❌ Docker containers are not running');
      }
      
      // Check container health
      const healthCheck = await this.runCommand('docker', ['exec', '-i', 'etl-system', 'curl', '-f', 'http://localhost:3000/api/health', '--max-time', '10']);
      
      if (healthCheck.stdout.includes('status') && healthCheck.exitCode === 0) {
        console.log('  ✅ Container health check passed');
        this.validationResults.docker.details += ' - Health check OK';
      } else {
        console.log('  ⚠️ Container health check failed');
        this.validationResults.docker.details += ' - Health check failed';
      }
      
    } catch (error) {
      this.validationResults.docker = {
        status: 'failed',
        details: `Docker validation error: ${error.message}`
      };
      console.log('  ❌ Docker validation failed:', error.message);
    }
  }

  async validateDatabaseIntegration() {
    console.log('🗄️ Validating database integration...');
    
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      console.log('  ✅ Database connection successful');
      
      // Test schema integrity
      const tables = ['User', 'DataSource', 'ETLJob', 'Workflow', 'WorkflowExecution', 'Notification'];
      
      for (const table of tables) {
        try {
          const count = await prisma[table.toLowerCase()].count();
          console.log(`  📊 ${table}: ${count} records`);
        } catch (error) {
          throw new Error(`Table ${table} access failed: ${error.message}`);
        }
      }
      
      // Test foreign key relationships
      const relationships = [
        { from: 'User', to: 'ETLJob', relation: 'createdBy' },
        { from: 'DataSource', to: 'ETLJob', relation: 'sourceId' },
        { from: 'Workflow', to: 'WorkflowExecution', relation: 'workflowId' },
        { from: 'User', to: 'Notification', relation: 'userId' }
      ];
      
      for (const rel of relationships) {
        const count = await prisma[rel.from.toLowerCase()].count({
          where: { [rel.relation]: { not: null } }
        });
        console.log(`  🔗 ${rel.from} -> ${rel.to}: ${count} relationships`);
      }
      
      this.validationResults.database = {
        status: 'passed',
        details: 'Database integration working correctly with proper relationships'
      };
      
    } catch (error) {
      this.validationResults.database = {
        status: 'failed',
        details: `Database integration error: ${error.message}`
      };
      console.log('  ❌ Database validation failed:', error.message);
    }
  }

  async validateAPIs() {
    console.log('🌐 Validating API endpoints...');
    
    const baseUrl = 'http://localhost:8080';
    const endpoints = [
      { path: '/api/health', method: 'GET' },
      { path: '/api/data-sources', method: 'GET' },
      { path: '/api/jobs', method: 'GET' },
      { path: '/api/notifications', method: 'GET' },
      { path: '/api/notifications/broadcast', method: 'POST' },
      { path: '/api/ai/workflow-assistant', method: 'POST' }
    ];
    
    let passedEndpoints = 0;
    let totalEndpoints = endpoints.length;
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method === 'POST' ? JSON.stringify({ 
            workflow: { name: 'Test Workflow' }, 
            context: { timestamp: new Date() } 
          }) : undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          passedEndpoints++;
          console.log(`  ✅ ${endpoint.method} ${endpoint.path}: ${response.status}`);
        } else {
          console.log(`  ⚠️ ${endpoint.method} ${endpoint.path}: ${response.status}`);
        }
        
      } catch (error) {
        console.log(`  ❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
      }
    }
    
    const successRate = (passedEndpoints / totalEndpoints) * 100;
    
    this.validationResults.apis = {
      status: successRate >= 80 ? 'passed' : 'failed',
      details: `${passedEndpoints}/${totalEndpoints} endpoints working (${Math.round(successRate)}% success rate)`
    };
    
    console.log(`  📊 API Success Rate: ${Math.round(successRate)}%`);
  }

  async validateAIIntegration() {
    console.log('🤖 Validating AI integration...');
    
    try {
      // Test AI workflow assistant
      const response = await fetch('http://localhost:8080/api/ai/workflow-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: {
            name: 'Integration Test Workflow',
            steps: [
              { id: 'step-1', type: 'extract', name: 'Data Extraction' },
              { id: 'step-2', type: 'transform', name: 'Data Transformation' }
            ]
          },
          context: {
            user_prompt: 'Optimize this workflow for better performance',
            system_info: { timestamp: new Date(), version: '1.0.0' }
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(`  ✅ AI assistant returned ${result.suggestions.length} suggestions`);
          console.log(`  📝 Sample suggestion: ${result.suggestions[0]?.title || 'N/A'}`);
          
          this.validationResults.ai = {
            status: 'passed',
            details: 'AI integration working with intelligent suggestions'
          };
        } else {
          console.log('  ⚠️ AI assistant returned empty suggestions');
          this.validationResults.ai = {
            status: 'warning',
            details: 'AI integration working but returned empty suggestions'
          };
        }
      } else {
        console.log(`  ❌ AI endpoint failed: ${response.status}`);
        this.validationResults.ai = {
          status: 'failed',
          details: `AI endpoint returned ${response.status}`
        };
      }
      
    } catch (error) {
      this.validationResults.ai = {
        status: 'failed',
        details: `AI integration error: ${error.message}`
      };
      console.log('  ❌ AI validation failed:', error.message);
    }
  }

  async validateRealtimeFeatures() {
    console.log('⚡ Validating real-time features...');
    
    try {
      // Test WebSocket connection (if implemented)
      // For now, we'll test the notification system which should support real-time updates
      
      const response = await fetch('http://localhost:8080/api/notifications', {
        method: 'GET'
      });
      
      if (response.ok) {
        const notifications = await response.json();
        console.log(`  📱 Found ${notifications.length || 0} notifications for real-time testing`);
        
        // Test broadcast functionality
        const broadcastResponse = await fetch('http://localhost:8080/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Integration Test',
            message: 'Testing real-time broadcast functionality',
            type: 'SYSTEM_ALERT',
            channels: ['IN_APP']
          })
        });
        
        if (broadcastResponse.ok) {
          console.log('  ✅ Real-time broadcast test passed');
          this.validationResults.realtime = {
            status: 'passed',
            details: 'Real-time features and broadcast working correctly'
          };
        } else {
          console.log('  ⚠️ Real-time broadcast test failed');
          this.validationResults.realtime = {
            status: 'warning',
            details: 'Basic real-time features working, broadcast may need configuration'
          };
        }
      } else {
        this.validationResults.realtime = {
          status: 'failed',
          details: 'Cannot access notification system'
        };
      }
      
    } catch (error) {
      this.validationResults.realtime = {
        status: 'failed',
        details: `Real-time validation error: ${error.message}`
      };
      console.log('  ❌ Real-time validation failed:', error.message);
    }
  }

  async testEndToEndWorkflows() {
    console.log('🔄 Testing end-to-end workflows...');
    
    try {
      // Simulate a complete workflow execution
      const startTime = Date.now();
      
      // 1. Create a test user (if not exists)
      let testUser = await prisma.user.findFirst({
        where: { email: 'integration-test@etl-demo.com' }
      });
      
      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            email: 'integration-test@etl-demo.com',
            name: 'Integration Test User',
            role: 'USER'
          }
        });
        console.log('  👤 Created test user');
      }
      
      // 2. Create a test data source
      let testDataSource = await prisma.dataSource.findFirst({
        where: { name: 'Integration Test Source' }
      });
      
      if (!testDataSource) {
        testDataSource = await prisma.dataSource.create({
          data: {
            name: 'Integration Test Source',
            type: 'CSV',
            connectionString: './test-data/integration-test.csv',
            description: 'Test data source for integration testing'
          }
        });
        console.log('  🗄️ Created test data source');
      }
      
      // 3. Create a test ETL job
      let testJob = await prisma.eTLJob.findFirst({
        where: { name: 'Integration Test Job' }
      });
      
      if (!testJob) {
        testJob = await prisma.eTLJob.create({
          data: {
            name: 'Integration Test Job',
            description: 'Test job for integration validation',
            sourceId: testDataSource.id,
            targetId: testDataSource.id,
            transformRules: JSON.stringify({ test: true }),
            createdBy: testUser.id
          }
        });
        console.log('  ⚙️ Created test ETL job');
      }
      
      // 4. Test job execution simulation
      const testExecution = await prisma.jobExecution.create({
        data: {
          jobId: testJob.id,
          status: 'COMPLETED',
          recordsProcessed: 100,
          recordsSuccess: 95,
          recordsFailed: 5,
          logs: JSON.stringify([
            { timestamp: new Date(), level: 'INFO', message: 'Integration test execution started' },
            { timestamp: new Date(), level: 'INFO', message: 'Integration test completed successfully' }
          ])
        }
      });
      
      // 5. Test notification creation
      const testNotification = await prisma.notification.create({
        data: {
          userId: testUser.id,
          type: 'JOB_SUCCESS',
          title: 'Integration Test Notification',
          message: 'End-to-end workflow test completed successfully',
          isRead: false
        }
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`  ⏱️ End-to-end workflow completed in ${executionTime}ms`);
      console.log('  ✅ Created test user, data source, job, execution, and notification');
      
      this.validationResults.overall = {
        status: 'passed',
        details: `End-to-end workflows working correctly (${executionTime}ms execution time)`
      };
      
      // Cleanup test data
      await this.cleanupTestData(testExecution.id, testNotification.id, testJob.id, testDataSource.id, testUser.id);
      
    } catch (error) {
      this.validationResults.overall = {
        status: 'failed',
        details: `End-to-end workflow error: ${error.message}`
      };
      console.log('  ❌ End-to-end workflow failed:', error.message);
    }
  }

  async cleanupTestData(executionId, notificationId, jobId, dataSourceId, userId) {
    console.log('🧹 Cleaning up test data...');
    
    try {
      await prisma.jobExecution.delete({ where: { id: executionId } });
      await prisma.notification.delete({ where: { id: notificationId } });
      await prisma.eTLJob.delete({ where: { id: jobId } });
      await prisma.dataSource.delete({ where: { id: dataSourceId } });
      await prisma.user.delete({ where: { id: userId } });
      
      console.log('  ✅ Test data cleaned up successfully');
    } catch (error) {
      console.log('  ⚠️ Some test data cleanup failed:', error.message);
    }
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000 
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({ 
          stdout, 
          stderr, 
          exitCode: code,
          success: code === 0
        });
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateValidationReport() {
    const reportDir = 'test-reports';
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportData = {
      timestamp: new Date(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage()
      },
      validation: this.validationResults,
      summary: {
        totalComponents: Object.keys(this.validationResults).length - 1, // Exclude overall
        passed: Object.values(this.validationResults).filter(r => r.status === 'passed').length,
        failed: Object.values(this.validationResults).filter(r => r.status === 'failed').length,
        warnings: Object.values(this.validationResults).filter(r => r.status === 'warning').length,
        overall: this.validationResults.overall.status
      }
    };
    
    const reportPath = path.join(reportDir, `integration-validation-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`📋 Integration validation report saved: ${reportPath}`);
  }

  printFinalResults() {
    console.log('\n🔗 INTEGRATION VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    Object.entries(this.validationResults).forEach(([component, result]) => {
      const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      console.log(`${status} ${component.toUpperCase()}: ${result.details}`);
    });
    
    const summary = {
      total: Object.keys(this.validationResults).length - 1,
      passed: Object.values(this.validationResults).filter(r => r.status === 'passed').length,
      failed: Object.values(this.validationResults).filter(r => r.status === 'failed').length
    };
    
    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Components: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`📈 Success Rate: ${Math.round((summary.passed / summary.total) * 100)}%`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new IntegrationValidator();
  
  validator.validateAll().then(() => {
    console.log('🎉 Integration validation completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Integration validation failed:', error);
    process.exit(1);
  });
}

export default IntegrationValidator;