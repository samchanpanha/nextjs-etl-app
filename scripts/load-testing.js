/**
 * 🚀 Load Testing and Performance Benchmarks Setup
 * 
 * This script provides comprehensive load testing capabilities for the ETL system
 * including concurrent user simulation, API stress testing, and performance monitoring.
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const prisma = new PrismaClient();

class LoadTester {
  constructor() {
    this.loadTestResults = {
      concurrentUsers: { tested: 0, passed: 0, failed: 0 },
      apiLoad: { tested: 0, passed: 0, failed: 0 },
      databaseLoad: { tested: 0, passed: 0, failed: 0 },
      memoryPressure: { tested: 0, passed: 0, failed: 0 },
      overall: { status: 'unknown', details: '' }
    };
    
    this.metrics = {
      responseTimes: [],
      throughput: [],
      errorRates: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }

  async runLoadTests() {
    try {
      console.log('🚀 Starting comprehensive load testing...');
      console.log('='.repeat(60));
      
      // Test system baseline
      await this.measureBaselinePerformance();
      
      // Run load tests
      await this.testConcurrentUsers([10, 50, 100, 500, 1000]);
      await this.testApiLoad([100, 500, 1000, 5000, 10000]);
      await this.testDatabaseLoad([100, 500, 1000, 5000, 10000]);
      await this.testMemoryPressure([1000, 5000, 10000, 25000, 50000]);
      
      // Generate reports
      await this.generateLoadTestReport();
      await this.generatePerformanceBenchmarks();
      
      console.log('✅ Load testing completed!');
      this.printLoadTestResults();
      
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      throw error;
    }
  }

  async measureBaselinePerformance() {
    console.log('📏 Measuring baseline performance...');
    
    try {
      // Measure API baseline
      const apiStart = performance.now();
      const response = await fetch('http://localhost:8080/api/health');
      const apiEnd = performance.now();
      
      this.metrics.baseline = {
        apiResponse: apiEnd - apiStart,
        apiStatus: response.status,
        timestamp: new Date()
      };
      
      console.log(`  📊 API baseline: ${Math.round(this.metrics.baseline.apiResponse)}ms`);
      
      // Measure database baseline
      const dbStart = performance.now();
      await prisma.user.count();
      await prisma.dataSource.count();
      await prisma.eTLJob.count();
      const dbEnd = performance.now();
      
      this.metrics.baseline.databaseQueries = dbEnd - dbStart;
      console.log(`  📊 DB baseline: ${Math.round(this.metrics.baseline.databaseQueries)}ms`);
      
      // Memory baseline
      const memUsage = process.memoryUsage();
      this.metrics.baseline.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
      };
      
      console.log(`  📊 Memory baseline: ${this.metrics.baseline.memory.heapUsed}MB heap`);
      
    } catch (error) {
      console.error('  ❌ Baseline measurement failed:', error.message);
    }
  }

  async testConcurrentUsers(userCounts) {
    console.log('👥 Testing concurrent users...');
    
    for (const userCount of userCounts) {
      console.log(`  🔄 Testing with ${userCount} concurrent users...`);
      
      try {
        const promises = Array.from({ length: userCount }, async (_, i) => {
          const startTime = performance.now();
          try {
            const response = await fetch('http://localhost:8080/api/health');
            const endTime = performance.now();
            return {
              success: response.ok,
              responseTime: endTime - startTime,
              userId: i
            };
          } catch (error) {
            return {
              success: false,
              responseTime: performance.now() - startTime,
              userId: i,
              error: error.message
            };
          }
        });
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        const errorRate = ((results.length - successCount) / results.length) * 100;
        
        console.log(`    ✅ Success: ${successCount}/${userCount} (${Math.round((successCount/userCount)*100)}%)`);
        console.log(`    ⏱️ Avg Response: ${Math.round(avgResponseTime)}ms`);
        console.log(`    ❌ Error Rate: ${Math.round(errorRate)}%`);
        
        // Record metrics
        this.metrics.responseTimes.push({
          users: userCount,
          avgTime: avgResponseTime,
          errorRate,
          successRate: Math.round((successCount/userCount)*100)
        });
        
        this.loadTestResults.concurrentUsers.tested += userCount;
        this.loadTestResults.concurrentUsers.passed += successCount;
        this.loadTestResults.concurrentUsers.failed += (userCount - successCount);
        
        // Add delay between test levels
        await this.delay(2000);
        
      } catch (error) {
        console.log(`    ❌ Concurrent users test failed for ${userCount}:`, error.message);
      }
    }
  }

  async testApiLoad(requestCounts) {
    console.log('🌐 Testing API load...');
    
    for (const requestCount of requestCounts) {
      console.log(`  🔄 Testing with ${requestCount} API requests...`);
      
      try {
        const endpoints = ['/api/health', '/api/data-sources', '/api/jobs', '/api/notifications'];
        const startTime = performance.now();
        
        const requests = Array.from({ length: requestCount }, async (_, i) => {
          const endpoint = endpoints[i % endpoints.length];
          try {
            const response = await fetch(`http://localhost:8080${endpoint}`);
            return { success: response.ok, status: response.status };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
        
        const results = await Promise.all(requests);
        const endTime = performance.now();
        
        const successCount = results.filter(r => r.success).length;
        const throughput = requestCount / ((endTime - startTime) / 1000); // requests per second
        const errorRate = ((results.length - successCount) / results.length) * 100;
        
        console.log(`    ✅ Success: ${successCount}/${requestCount}`);
        console.log(`    ⚡ Throughput: ${Math.round(throughput)} req/sec`);
        console.log(`    ❌ Error Rate: ${Math.round(errorRate)}%`);
        
        // Record metrics
        this.metrics.throughput.push({
          requests: requestCount,
          throughput,
          errorRate,
          duration: endTime - startTime
        });
        
        this.loadTestResults.apiLoad.tested += requestCount;
        this.loadTestResults.apiLoad.passed += successCount;
        this.loadTestResults.apiLoad.failed += (requestCount - successCount);
        
        await this.delay(1000);
        
      } catch (error) {
        console.log(`    ❌ API load test failed for ${requestCount}:`, error.message);
      }
    }
  }

  async testDatabaseLoad(queryCounts) {
    console.log('🗄️ Testing database load...');
    
    for (const queryCount of queryCounts) {
      console.log(`  🔄 Testing with ${queryCount} database queries...`);
      
      try {
        const startTime = performance.now();
        
        const queries = Array.from({ length: queryCount }, async () => {
          try {
            // Mix of different query types
            const queries = [
              () => prisma.user.count(),
              () => prisma.dataSource.findMany({ take: 10 }),
              () => prisma.eTLJob.findMany({ take: 5, where: { isActive: true } }),
              () => prisma.notification.findMany({ take: 10 })
            ];
            
            const query = queries[Math.floor(Math.random() * queries.length)];
            await query();
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
        
        const results = await Promise.all(queries);
        const endTime = performance.now();
        
        const successCount = results.filter(r => r.success).length;
        const throughput = queryCount / ((endTime - startTime) / 1000); // queries per second
        const errorRate = ((results.length - successCount) / results.length) * 100;
        
        console.log(`    ✅ Success: ${successCount}/${queryCount}`);
        console.log(`    ⚡ Throughput: ${Math.round(throughput)} queries/sec`);
        console.log(`    ❌ Error Rate: ${Math.round(errorRate)}%`);
        
        // Record metrics
        this.metrics.throughput.push({
          databaseQueries: queryCount,
          throughput,
          errorRate,
          duration: endTime - startTime
        });
        
        this.loadTestResults.databaseLoad.tested += queryCount;
        this.loadTestResults.databaseLoad.passed += successCount;
        this.loadTestResults.databaseLoad.failed += (queryCount - successCount);
        
        await this.delay(1000);
        
      } catch (error) {
        console.log(`    ❌ Database load test failed for ${queryCount}:`, error.message);
      }
    }
  }

  async testMemoryPressure(dataSizes) {
    console.log('🧠 Testing memory pressure...');
    
    for (const dataSize of dataSizes) {
      console.log(`  🔄 Testing with ${dataSize} records in memory...`);
      
      try {
        const startTime = performance.now();
        const memBefore = process.memoryUsage();
        
        // Simulate memory-intensive operations
        const data = [];
        for (let i = 0; i < dataSize; i++) {
          data.push({
            id: i,
            name: `Record ${i}`,
            data: Array.from({ length: 100 }, (_, j) => `data_${j}_${i}_${Date.now()}`),
            metadata: {
              created: new Date(),
              modified: new Date(),
              tags: [`tag${Math.floor(Math.random() * 10)}`, `category${Math.floor(Math.random() * 5)}`]
            }
          });
        }
        
        const memDuring = process.memoryUsage();
        const avgMemory = (memDuring.heapUsed + memBefore.heapUsed) / 2;
        
        // Test operations on large dataset
        const filtered = data.filter(item => item.id % 100 === 0);
        const mapped = data.slice(0, 1000).map(item => ({ ...item, processed: true }));
        
        // Cleanup
        data.length = 0;
        
        const endTime = performance.now();
        const memAfter = process.memoryUsage();
        
        console.log(`    ✅ Processed ${dataSize} records in ${Math.round(endTime - startTime)}ms`);
        console.log(`    🧠 Memory usage: ${Math.round(avgMemory / 1024 / 1024 * 100) / 100}MB`);
        console.log(`    📊 Memory growth: ${Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024 * 100) / 100}MB`);
        
        // Record metrics
        this.metrics.memoryUsage.push({
          records: dataSize,
          duration: endTime - startTime,
          memoryUsed: Math.round(avgMemory / 1024 / 1024 * 100) / 100,
          memoryGrowth: Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024 * 100) / 100
        });
        
        this.loadTestResults.memoryPressure.tested += dataSize;
        this.loadTestResults.memoryPressure.passed += dataSize;
        
        await this.delay(500);
        
      } catch (error) {
        console.log(`    ❌ Memory pressure test failed for ${dataSize}:`, error.message);
        this.loadTestResults.memoryPressure.failed += dataSize;
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateLoadTestReport() {
    const reportDir = 'test-reports';
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportData = {
      timestamp: new Date(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100
      },
      baseline: this.metrics.baseline,
      loadTestResults: this.loadTestResults,
      metrics: this.metrics,
      recommendations: this.generateLoadTestRecommendations()
    };
    
    const reportPath = path.join(reportDir, `load-test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`📋 Load test report saved: ${reportPath}`);
  }

  async generatePerformanceBenchmarks() {
    const reportDir = 'test-reports';
    const reportPath = path.join(reportDir, `performance-benchmarks-${Date.now()}.json`);
    
    const benchmarks = {
      timestamp: new Date(),
      api: this.calculateApiBenchmarks(),
      database: this.calculateDatabaseBenchmarks(),
      memory: this.calculateMemoryBenchmarks(),
      scalability: this.calculateScalabilityMetrics()
    };
    
    await fs.writeFile(reportPath, JSON.stringify(benchmarks, null, 2));
    
    console.log(`🏆 Performance benchmarks saved: ${reportPath}`);
  }

  calculateApiBenchmarks() {
    const apiMetrics = this.metrics.responseTimes.filter(m => m.users);
    
    if (apiMetrics.length === 0) return {};
    
    return {
      maxConcurrentUsers: Math.max(...apiMetrics.map(m => m.users)),
      avgResponseTime: Math.round(apiMetrics.reduce((sum, m) => sum + m.avgTime, 0) / apiMetrics.length),
      maxResponseTime: Math.round(Math.max(...apiMetrics.map(m => m.avgTime))),
      successRate: Math.round(apiMetrics.reduce((sum, m) => sum + m.successRate, 0) / apiMetrics.length),
      maxThroughput: Math.max(...apiMetrics.map(m => (m.users / m.avgTime) * 1000)) || 0
    };
  }

  calculateDatabaseBenchmarks() {
    const dbMetrics = this.metrics.throughput.filter(m => m.databaseQueries);
    
    if (dbMetrics.length === 0) return {};
    
    return {
      maxQueries: Math.max(...dbMetrics.map(m => m.databaseQueries)),
      avgThroughput: Math.round(dbMetrics.reduce((sum, m) => sum + m.throughput, 0) / dbMetrics.length),
      maxThroughput: Math.round(Math.max(...dbMetrics.map(m => m.throughput))),
      successRate: Math.round(dbMetrics.reduce((sum, m) => sum + (100 - m.errorRate), 0) / dbMetrics.length)
    };
  }

  calculateMemoryBenchmarks() {
    const memoryMetrics = this.metrics.memoryUsage;
    
    if (memoryMetrics.length === 0) return {};
    
    return {
      maxRecords: Math.max(...memoryMetrics.map(m => m.records)),
      maxMemoryUsage: Math.max(...memoryMetrics.map(m => m.memoryUsed)),
      avgProcessingTime: Math.round(memoryMetrics.reduce((sum, m) => sum + m.duration, 0) / memoryMetrics.length),
      memoryEfficiency: Math.round(memoryMetrics.reduce((sum, m) => sum + (m.records / m.memoryUsed), 0) / memoryMetrics.length)
    };
  }

  calculateScalabilityMetrics() {
    const responseTimeMetrics = this.metrics.responseTimes;
    
    if (responseTimeMetrics.length === 0) return {};
    
    // Calculate scalability factor (how well system handles load increases)
    const lowLoad = responseTimeMetrics.find(m => m.users <= 10);
    const highLoad = responseTimeMetrics.find(m => m.users >= 1000);
    
    if (!lowLoad || !highLoad) return {};
    
    const loadIncrease = highLoad.users / lowLoad.users;
    const responseTimeIncrease = highLoad.avgTime / lowLoad.avgTime;
    const scalabilityFactor = loadIncrease / responseTimeIncrease;
    
    return {
      scalabilityFactor: Math.round(scalabilityFactor * 100) / 100,
      loadIncrease: Math.round(loadIncrease),
      responseTimeIncrease: Math.round(responseTimeIncrease * 100) / 100,
      classification: scalabilityFactor > 0.7 ? 'Excellent' : scalabilityFactor > 0.5 ? 'Good' : scalabilityFactor > 0.3 ? 'Fair' : 'Poor'
    };
  }

  generateLoadTestRecommendations() {
    const recommendations = [];
    
    // Check overall system health
    const totalOperations = this.loadTestResults.concurrentUsers.tested + 
                           this.loadTestResults.apiLoad.tested + 
                           this.loadTestResults.databaseLoad.tested;
    
    const totalPasses = this.loadTestResults.concurrentUsers.passed + 
                       this.loadTestResults.apiLoad.passed + 
                       this.loadTestResults.databaseLoad.passed;
    
    const overallSuccessRate = (totalPasses / totalOperations) * 100;
    
    if (overallSuccessRate < 90) {
      recommendations.push({
        priority: 'HIGH',
        category: 'System Stability',
        recommendation: 'System shows signs of instability under load - investigate bottlenecks',
        impact: 'Production issues under high traffic'
      });
    }
    
    // Check memory usage
    const maxMemoryUsage = Math.max(...this.metrics.memoryUsage.map(m => m.memoryUsed));
    if (maxMemoryUsage > 500) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Memory Management',
        recommendation: 'High memory usage detected - implement memory management optimizations',
        impact: 'Potential out-of-memory errors in production'
      });
    }
    
    // Check scalability
    const scalability = this.calculateScalabilityMetrics();
    if (scalability.classification === 'Poor' || scalability.classification === 'Fair') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Scalability',
        recommendation: 'System scalability is limited - consider horizontal scaling or optimization',
        impact: 'Cannot handle large-scale deployments'
      });
    }
    
    return recommendations;
  }

  printLoadTestResults() {
    console.log('\n🚀 LOAD TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log('👥 CONCURRENT USERS');
    console.log(`  Tested: ${this.loadTestResults.concurrentUsers.tested}`);
    console.log(`  ✅ Passed: ${this.loadTestResults.concurrentUsers.passed}`);
    console.log(`  ❌ Failed: ${this.loadTestResults.concurrentUsers.failed}`);
    
    console.log('\n🌐 API LOAD');
    console.log(`  Tested: ${this.loadTestResults.apiLoad.tested}`);
    console.log(`  ✅ Passed: ${this.loadTestResults.apiLoad.passed}`);
    console.log(`  ❌ Failed: ${this.loadTestResults.apiLoad.failed}`);
    
    console.log('\n🗄️ DATABASE LOAD');
    console.log(`  Tested: ${this.loadTestResults.databaseLoad.tested}`);
    console.log(`  ✅ Passed: ${this.loadTestResults.databaseLoad.passed}`);
    console.log(`  ❌ Failed: ${this.loadTestResults.databaseLoad.failed}`);
    
    console.log('\n🧠 MEMORY PRESSURE');
    console.log(`  Tested: ${this.loadTestResults.memoryPressure.tested}`);
    console.log(`  ✅ Passed: ${this.loadTestResults.memoryPressure.passed}`);
    console.log(`  ❌ Failed: ${this.loadTestResults.memoryPressure.failed}`);
    
    const totalOperations = this.loadTestResults.concurrentUsers.tested + 
                           this.loadTestResults.apiLoad.tested + 
                           this.loadTestResults.databaseLoad.tested + 
                           this.loadTestResults.memoryPressure.tested;
    
    const totalPasses = this.loadTestResults.concurrentUsers.passed + 
                       this.loadTestResults.apiLoad.passed + 
                       this.loadTestResults.databaseLoad.passed + 
                       this.loadTestResults.memoryPressure.passed;
    
    const overallSuccessRate = Math.round((totalPasses / totalOperations) * 100);
    
    console.log('\n📊 OVERALL RESULTS');
    console.log(`  Total Operations: ${totalOperations}`);
    console.log(`  ✅ Overall Success Rate: ${overallSuccessRate}%`);
    console.log(`  🏆 System Classification: ${overallSuccessRate >= 95 ? 'Excellent' : overallSuccessRate >= 85 ? 'Good' : overallSuccessRate >= 70 ? 'Fair' : 'Poor'}`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const loadTester = new LoadTester();
  
  loadTester.runLoadTests().then(() => {
    console.log('🎉 Load testing completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Load testing failed:', error);
    process.exit(1);
  });
}

export default LoadTester;