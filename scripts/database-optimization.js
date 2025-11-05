/**
 * 🗄️ Database Optimization Script for ETL Testing
 * 
 * This script optimizes SQLite database settings for testing environments
 * with better performance and reliability settings.
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Optimized SQLite settings for testing
const OPTIMIZED_SETTINGS = {
  // Performance optimizations
  PRAGMA_CACHE_SIZE: 10000,        // Increase cache size
  PRAGMA_JOURNAL_MODE: 'WAL',      // Write-Ahead Logging for better concurrency
  PRAGMA_SYNCHRONOUS: 'NORMAL',    // Balance between safety and speed
  PRAGMA_TEMP_STORE: 'MEMORY',     // Store temporary tables in memory
  PRAGMA_MMAP_SIZE: 268435456,     // Enable memory mapping (256MB)
  
  // Connection optimizations
  PRAGMA_BUSY_TIMEOUT: 30000,      // 30 second timeout
  PRAGMA_QUERY_ONLY: false,        // Allow writes in testing
  
  // Memory optimizations
  PRAGMA_PCACHE_SIZE: 1000,        // Page cache size
  PRAGMA_INCR_VACUUM: true,        // Incremental vacuum for fragmentation
  
  // Data integrity
  PRAGMA_FOREIGN_KEYS: true,       // Enable foreign key constraints
  PRAGMA_IGNORE_CHECK_CONSTRAINTS: false, // Enforce check constraints
};

class DatabaseOptimizer {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  }

  async optimize() {
    try {
      console.log('🗄️ Starting database optimization...');
      
      // Apply optimization pragmas
      await this.applyOptimizationPragmas();
      
      // Create indexes for better performance
      await this.createOptimizationIndexes();
      
      // Verify optimization
      await this.verifyOptimization();
      
      console.log('✅ Database optimization completed successfully!');
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  async applyOptimizationPragmas() {
    console.log('📋 Applying optimization settings...');
    
    const pragmas = [
      `PRAGMA cache_size = ${OPTIMIZED_SETTINGS.PRAGMA_CACHE_SIZE}`,
      `PRAGMA journal_mode = ${OPTIMIZED_SETTINGS.PRAGMA_JOURNAL_MODE}`,
      `PRAGMA synchronous = ${OPTIMIZED_SETTINGS.PRAGMA_SYNCHRONOUS}`,
      `PRAGMA temp_store = ${OPTIMIZED_SETTINGS.PRAGMA_TEMP_STORE}`,
      `PRAGMA mmap_size = ${OPTIMIZED_SETTINGS.PRAGMA_MMAP_SIZE}`,
      `PRAGMA busy_timeout = ${OPTIMIZED_SETTINGS.PRAGMA_BUSY_TIMEOUT}`,
      `PRAGMA foreign_keys = ${OPTIMIZED_SETTINGS.PRAGMA_FOREIGN_KEYS}`,
      `PRAGMA ignore_check_constraints = ${OPTIMIZED_SETTINGS.PRAGMA_IGNORE_CHECK_CONSTRAINTS}`,
    ];

    for (const pragma of pragmas) {
      await prisma.$executeRawUnsafe(pragma);
      console.log(`  ✅ Applied: ${pragma}`);
    }
  }

  async createOptimizationIndexes() {
    console.log('🔍 Creating optimization indexes...');
    
    // Critical indexes for ETL operations
    const indexes = [
      {
        name: 'idx_workflows_name',
        table: 'Workflow',
        column: 'name'
      },
      {
        name: 'idx_workflows_status',
        table: 'Workflow',
        column: 'status'
      },
      {
        name: 'idx_workflows_created',
        table: 'Workflow',
        column: 'createdAt'
      },
      {
        name: 'idx_workflow_executions_workflowId',
        table: 'WorkflowExecution',
        column: 'workflowId'
      },
      {
        name: 'idx_workflow_executions_status',
        table: 'WorkflowExecution',
        column: 'status'
      },
      {
        name: 'idx_workflow_executions_created',
        table: 'WorkflowExecution',
        column: 'createdAt'
      },
      {
        name: 'idx_jobs_status',
        table: 'Job',
        column: 'status'
      },
      {
        name: 'idx_jobs_priority',
        table: 'Job',
        column: 'priority'
      },
      {
        name: 'idx_jobs_scheduled',
        table: 'Job',
        column: 'scheduledAt'
      }
    ];

    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`
        );
        console.log(`  ✅ Created index: ${index.name}`);
      } catch (error) {
        console.warn(`  ⚠️ Index ${index.name} may already exist:`, error.message);
      }
    }
  }

  async verifyOptimization() {
    console.log('🔍 Verifying optimization...');
    
    // Check applied settings
    const settings = [
      'PRAGMA cache_size',
      'PRAGMA journal_mode',
      'PRAGMA synchronous',
      'PRAGMA temp_store',
      'PRAGMA busy_timeout'
    ];

    for (const setting of settings) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT ${setting} as value`);
        console.log(`  📊 ${setting}: ${JSON.stringify(result)}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not verify ${setting}:`, error.message);
      }
    }

    // Check table statistics
    await this.showTableStats();
  }

  async showTableStats() {
    console.log('📊 Database statistics:');
    
    const tables = ['Workflow', 'WorkflowExecution', 'Job', 'DataSource', 'Notification'];
    
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        console.log(`  📈 ${table}: ${JSON.stringify(count[0])} records`);
      } catch (error) {
        console.warn(`  ⚠️ Could not get stats for ${table}:`, error.message);
      }
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new DatabaseOptimizer();
  
  optimizer.optimize().then(() => {
    console.log('🎉 Database optimization script completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Database optimization script failed:', error);
    process.exit(1);
  });
}

export default DatabaseOptimizer;