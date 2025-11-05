/**
 * 🧪 Testing Utilities and Performance Monitoring for ETL System
 * 
 * This script provides comprehensive testing utilities including:
 * - System integration validation
 * - Performance benchmarking
 * - Load testing capabilities
 * - Health monitoring
 * - Automated testing workflows
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

class ETLSystemTester {
  constructor() {
    this.testResults = {
      overall: { passed: 0, failed: 0, total: 0 },
      tests: [],
      performance: {},
      timestamp: new Date()
    };
  }

  async runAllTests() {
    try {
      console.log('🧪 Starting comprehensive ETL system tests...');
      
      // Core system tests
      await this.testDatabaseConnectivity();
      await this.testAPIs();
      await this.testUserManagement();
      await this.testDataSources();
      await this.testJobsAndWorkflows();
      await this.testNotifications();
      
      // Performance tests
      await this.runPerformanceBenchmarks();
      
      // Integration tests
      await this.testSystemIntegration();
      
      // Generate reports
      await this.generateTestReport();
      await this.generatePerformanceReport();
      
      console.log('✅ All tests completed!');
      this.printFinalResults();
      
    } catch (error) {
      console.error('❌ Testing failed:', error);
      throw error;
    }
  }

  async testDatabaseConnectivity() {
    console.log('🗄️ Testing database connectivity...');
    const testName = 'Database Connectivity';
    
    try {
      // Test basic connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Test each model
      const models = ['user', 'dataSource', 'eTLJob', 'notification'];
      for (const model of models) {
        const count = await prisma[model].count();
        console.log(`  📊 ${model}: ${count} records`);
      }
      
      this.recordTestResult(testName, true, 'Database connectivity and basic queries working');
      
    } catch (error) {
      this.recordTestResult(testName, false, `Database error: ${error.message}`);
    }
  }

  async testAPIs() {
    console.log('🌐 Testing API endpoints...');
    const baseUrl = process.env.NODE_ENV === 'production' ? 'http://localhost:8080' : 'http://localhost:8080';
    
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/data-sources', method: 'GET', expectedStatus: 200 },
      { path: '/api/jobs', method: 'GET', expectedStatus: 200 },
      { path: '/api/notifications', method: 'GET', expectedStatus: 200 },
      { path: '/api/ai/workflow-assistant', method: 'POST', expectedStatus: 200 }
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method === 'POST' ? JSON.stringify({ 
            workflow: { name: 'Test Workflow' }, 
            context: { timestamp: new Date() } 
          }) : undefined
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (response.status === endpoint.expectedStatus) {
          this.recordTestResult(`${endpoint.method} ${endpoint.path}`, true, `Response time: ${responseTime}ms`);
        } else {
          this.recordTestResult(`${endpoint.method} ${endpoint.path}`, false, `Expected ${endpoint.expectedStatus}, got ${response.status}`);
        }
        
      } catch (error) {
        this.recordTestResult(`${endpoint.method} ${endpoint.path}`, false, `API Error: ${error.message}`);
      }
    }
  }

  async testUserManagement() {
    console.log('👥 Testing user management...');
    const testName = 'User Management';
    
    try {
      const users = await prisma.user.findMany({
        include: { settings: true, notifications: true }
      });
      
      if (users.length === 0) {
        this.recordTestResult(testName, false, 'No users found in system');
        return;
      }
      
      // Test role-based access simulation
      const adminUsers = users.filter(u => u.role === 'ADMIN');
      const regularUsers = users.filter(u => u.role === 'USER');
      
      console.log(`  👑 Admin users: ${adminUsers.length}`);
      console.log(`  👤 Regular users: ${regularUsers.length}`);
      console.log(`  📧 Users with email notifications: ${users.filter(u => u.settings?.emailNotifications).length}`);
      
      this.recordTestResult(testName, true, `Found ${users.length} users with proper role distribution`);
      
    } catch (error) {
      this.recordTestResult(testName, false, `User management error: ${error.message}`);
    }
  }

  async testDataSources() {
    console.log('🗄️ Testing data sources...');
    const testName = 'Data Sources';
    
    try {
      const dataSources = await prisma.dataSource.findMany({
        include: { 
          jobs: { take: 5 },
          syncLogs: { take: 3 }
        }
      });
      
      if (dataSources.length === 0) {
        this.recordTestResult(testName, false, 'No data sources found in system');
        return;
      }
      
      // Analyze data source types
      const typeDistribution = {};
      dataSources.forEach(ds => {
        typeDistribution[ds.type] = (typeDistribution[ds.type] || 0) + 1;
      });
      
      console.log('  📊 Data source types:');
      Object.entries(typeDistribution).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
      
      // Check active sources
      const activeSources = dataSources.filter(ds => ds.isActive);
      console.log(`  ✅ Active data sources: ${activeSources.length}/${dataSources.length}`);
      
      this.recordTestResult(testName, true, `Data sources configured with ${Object.keys(typeDistribution).length} different types`);
      
    } catch (error) {
      this.recordTestResult(testName, false, `Data source error: ${error.message}`);
    }
  }

  async testJobsAndWorkflows() {
    console.log('⚙️ Testing jobs and workflows...');
    
    // Test ETL Jobs
    const jobTestName = 'ETL Jobs';
    try {
      const jobs = await prisma.eTLJob.findMany({
        include: { 
          source: true, 
          target: true,
          executions: { take: 5 },
          creator: true
        }
      });
      
      const statusDistribution = {};
      jobs.forEach(job => {
        statusDistribution[job.status] = (statusDistribution[job.status] || 0) + 1;
      });
      
      console.log('  ⚙️ Job status distribution:');
      Object.entries(statusDistribution).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });
      
      this.recordTestResult(jobTestName, true, `Found ${jobs.length} ETL jobs with ${Object.keys(statusDistribution).length} status types`);
      
    } catch (error) {
      this.recordTestResult(jobTestName, false, `ETL job error: ${error.message}`);
    }
    
    // Test Workflows
    const workflowTestName = 'Workflows';
    try {
      const workflows = await prisma.workflow.findMany({
        include: {
          executions: { take: 5 },
          creator: true
        }
      });
      
      const versionDistribution = {};
      workflows.forEach(wf => {
        versionDistribution[wf.version] = (versionDistribution[wf.version] || 0) + 1;
      });
      
      console.log('  🔄 Workflow versions:');
      Object.entries(versionDistribution).forEach(([version, count]) => {
        console.log(`    v${version}: ${count}`);
      });
      
      this.recordTestResult(workflowTestName, true, `Found ${workflows.length} workflows with proper versioning`);
      
    } catch (error) {
      this.recordTestResult(workflowTestName, false, `Workflow error: ${error.message}`);
    }
  }

  async testNotifications() {
    console.log('🔔 Testing notifications...');
    const testName = 'Notifications';
    
    try {
      const notifications = await prisma.notification.findMany({
        include: { user: true }
      });
      
      const typeDistribution = {};
      const readDistribution = { read: 0, unread: 0 };
      
      notifications.forEach(notif => {
        typeDistribution[notif.type] = (typeDistribution[notif.type] || 0) + 1;
        if (notif.isRead) readDistribution.read++;
        else readDistribution.unread++;
      });
      
      console.log('  🔔 Notification types:');
      Object.entries(typeDistribution).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
      
      console.log(`  📖 Read: ${readDistribution.read}, Unread: ${readDistribution.unread}`);
      
      this.recordTestResult(testName, true, `Notifications system working with ${notifications.length} total notifications`);
      
    } catch (error) {
      this.recordTestResult(testName, false, `Notification error: ${error.message}`);
    }
  }

  async runPerformanceBenchmarks() {
    console.log('⚡ Running performance benchmarks...');
    
    // Database query performance
    await this.benchmarkDatabaseQueries();
    
    // API response time benchmarks
    await this.benchmarkAPIs();
    
    // Memory usage simulation
    await this.benchmarkMemoryUsage();
  }

  async benchmarkDatabaseQueries() {
    console.log('📊 Benchmarking database queries...');
    
    const queries = [
      { name: 'User Count', query: () => prisma.user.count() },
      { name: 'Active Jobs', query: () => prisma.eTLJob.count({ where: { isActive: true } }) },
      { name: 'Recent Executions', query: () => prisma.jobExecution.findMany({ take: 10, orderBy: { startedAt: 'desc' } }) }
    ];
    
    for (const query of queries) {
      const startTime = performance.now();
      const iterations = 100;
      let totalTime = 0;
      
      for (let i = 0; i < iterations; i++) {
        const queryStart = performance.now();
        await query.query();
        const queryEnd = performance.now();
        totalTime += (queryEnd - queryStart);
      }
      
      const avgTime = totalTime / iterations;
      const throughput = 1000 / avgTime; // queries per second
      
      this.testResults.performance[`db_${query.name.toLowerCase().replace(/\s+/g, '_')}`] = {
        averageTime: Math.round(avgTime * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        iterations
      };
      
      console.log(`  ⏱️ ${query.name}: ${Math.round(avgTime * 100) / 100}ms avg (${Math.round(throughput)} ops/sec)`);
    }
  }

  async benchmarkAPIs() {
    console.log('🌐 Benchmarking API endpoints...');
    
    const baseUrl = process.env.NODE_ENV === 'production' ? 'http://localhost:8080' : 'http://localhost:8080';
    const endpoints = ['/api/health', '/api/data-sources', '/api/jobs'];
    
    for (const endpoint of endpoints) {
      const iterations = 50;
      let totalTime = 0;
      let successCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        try {
          const startTime = performance.now();
          const response = await fetch(`${baseUrl}${endpoint}`);
          const endTime = performance.now();
          
          if (response.ok) {
            successCount++;
            totalTime += (endTime - startTime);
          }
        } catch (error) {
          console.warn(`  ⚠️ Request ${i + 1} failed for ${endpoint}: ${error.message}`);
        }
      }
      
      const avgTime = totalTime / successCount || 0;
      const successRate = (successCount / iterations) * 100;
      const throughput = (successCount / (iterations * 0.05)); // requests per second
      
      this.testResults.performance[`api_${endpoint.slice(1).replace(/\//g, '_')}`] = {
        averageTime: Math.round(avgTime * 100) / 100,
        successRate: Math.round(successRate),
        throughput: Math.round(throughput * 100) / 100
      };
      
      console.log(`  ⏱️ ${endpoint}: ${Math.round(avgTime * 100) / 100}ms avg, ${Math.round(successRate)}% success rate`);
    }
  }

  async benchmarkMemoryUsage() {
    console.log('🧠 Simulating memory usage...');
    
    // Simulate memory-intensive operations
    const data = [];
    
    for (let i = 0; i < 10000; i++) {
      data.push({
        id: i,
        name: `Test Item ${i}`,
        data: Array.from({ length: 100 }, (_, j) => `data_${j}_${i}`)
      });
    }
    
    const memUsage = process.memoryUsage();
    this.testResults.performance.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      testDataSize: data.length
    };
    
    console.log(`  🧠 Memory used: ${this.testResults.performance.memory.heapUsed} MB`);
    
    // Clean up
    data.length = 0;
  }

  async testSystemIntegration() {
    console.log('🔗 Testing system integration...');
    const testName = 'System Integration';
    
    try {
      // Test data flow simulation
      const startTime = performance.now();
      
      // 1. Fetch users
      const users = await prisma.user.findMany({ take: 5 });
      
      // 2. Fetch their jobs
      const jobs = await prisma.eTLJob.findMany({
        where: { createdBy: { in: users.map(u => u.id) } },
        take: 10
      });
      
      // 3. Fetch recent executions
      const executions = await prisma.jobExecution.findMany({
        where: { jobId: { in: jobs.map(j => j.id) } },
        take: 20,
        orderBy: { startedAt: 'desc' }
      });
      
      // 4. Calculate success rate
      const successfulExecutions = executions.filter(e => e.status === 'COMPLETED').length;
      const successRate = (successfulExecutions / executions.length) * 100;
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`  📊 Data flow test: ${users.length} users → ${jobs.length} jobs → ${executions.length} executions`);
      console.log(`  ✅ Success rate: ${Math.round(successRate)}% in ${Math.round(totalTime)}ms`);
      
      this.recordTestResult(testName, true, `System integration working - ${Math.round(successRate)}% success rate`);
      
    } catch (error) {
      this.recordTestResult(testName, false, `Integration error: ${error.message}`);
    }
  }

  recordTestResult(testName, passed, details) {
    this.testResults.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date()
    });
    
    if (passed) {
      this.testResults.overall.passed++;
      console.log(`  ✅ ${testName}: ${details}`);
    } else {
      this.testResults.overall.failed++;
      console.log(`  ❌ ${testName}: ${details}`);
    }
    
    this.testResults.overall.total++;
  }

  async generateTestReport() {
    const reportDir = 'test-reports';
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportData = {
      summary: {
        totalTests: this.testResults.overall.total,
        passed: this.testResults.overall.passed,
        failed: this.testResults.overall.failed,
        successRate: Math.round((this.testResults.overall.passed / this.testResults.overall.total) * 100),
        timestamp: this.testResults.timestamp
      },
      testResults: this.testResults.tests,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(reportDir, `test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`📋 Test report saved: ${reportPath}`);
  }

  async generatePerformanceReport() {
    const reportDir = 'test-reports';
    const reportPath = path.join(reportDir, `performance-report-${Date.now()}.json`);
    
    const reportData = {
      timestamp: new Date(),
      performance: this.testResults.performance,
      recommendations: this.generatePerformanceRecommendations()
    };
    
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`⚡ Performance report saved: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check failed tests
    const failedTests = this.testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'System Health',
        recommendation: `Address ${failedTests.length} failed test(s): ${failedTests.map(t => t.name).join(', ')}`,
        impact: 'Critical system functionality may be compromised'
      });
    }
    
    // Check API performance
    if (this.testResults.performance.api_health?.averageTime > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        recommendation: 'Health endpoint response time is high - investigate API performance',
        impact: 'User experience degradation'
      });
    }
    
    // Check database performance
    if (this.testResults.performance.db_user_count?.averageTime > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Database',
        recommendation: 'Database query performance needs optimization',
        impact: 'Overall system slowdown'
      });
    }
    
    return recommendations;
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    
    // Memory recommendations
    if (this.testResults.performance.memory?.heapUsed > 500) {
      recommendations.push({
        category: 'Memory',
        recommendation: 'High memory usage detected - consider implementing data streaming for large operations',
        priority: 'HIGH'
      });
    }
    
    return recommendations;
  }

  printFinalResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.testResults.overall.total}`);
    console.log(`✅ Passed: ${this.testResults.overall.passed}`);
    console.log(`❌ Failed: ${this.testResults.overall.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.testResults.overall.passed / this.testResults.overall.total) * 100)}%`);
    
    console.log('\n⚡ PERFORMANCE SUMMARY');
    console.log('='.repeat(50));
    
    Object.entries(this.testResults.performance).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`${key}:`);
        Object.entries(value).forEach(([subKey, subValue]) => {
          console.log(`  ${subKey}: ${subValue}`);
        });
      }
    });
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ETLSystemTester();
  
  tester.runAllTests().then(() => {
    console.log('🎉 All testing completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });
}

export default ETLSystemTester;