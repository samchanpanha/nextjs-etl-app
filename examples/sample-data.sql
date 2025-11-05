-- Example Data and Testing Scenarios for ETL System
-- This script creates sample data sources, jobs, and test scenarios

-- Insert sample users with different roles
INSERT INTO users (id, email, name, role, createdAt, updatedAt) VALUES
('admin-user-id', 'admin@company.com', 'System Administrator', 'ADMIN', NOW(), NOW()),
('john-analyst-id', 'john.analyst@company.com', 'John Analyst', 'USER', NOW(), NOW()),
('jane-viewer-id', 'jane.viewer@company.com', 'Jane Viewer', 'VIEWER', NOW(), NOW()),
('bob-data-id', 'bob.data@company.com', 'Bob Data Scientist', 'USER', NOW(), NOW());

-- Insert sample user settings
INSERT INTO user_settings (id, userId, theme, timezone, language, emailNotifications, telegramNotifications) VALUES
('admin-settings-id', 'admin-user-id', 'dark', 'UTC', 'en', true, false),
('john-settings-id', 'john-analyst-id', 'light', 'America/New_York', 'en', true, true),
('jane-settings-id', 'jane-viewer-id', 'system', 'UTC', 'en', false, false),
('bob-settings-id', 'bob-data-id', 'dark', 'America/Los_Angeles', 'en', true, false);

-- Insert sample data sources
INSERT INTO data_sources (id, name, type, connectionString, description, isActive, createdAt, updatedAt) VALUES
('mysql-sales-db', 'Production Sales Database', 'MYSQL', 'mysql://user:password@mysql-server:3306/sales_db', 'Main sales database with customer and order data', true, NOW(), NOW()),
('postgres-analytics-db', 'Analytics Warehouse', 'POSTGRESQL', 'postgresql://user:password@postgres-server:5432/analytics', 'Data warehouse for analytics and reporting', true, NOW(), NOW()),
('api-company-data', 'Company API', 'API', 'https://api.company.com/v1', 'REST API for company information', true, NOW(), NOW()),
('csv-reports-folder', 'Monthly Reports CSV', 'CSV', '/data/reports/', 'CSV files containing monthly reports', false, NOW(), NOW()),
('excel-sales-files', 'Sales Excel Files', 'EXCEL', 'C:\\SalesData\\', 'Excel files with sales data', false, NOW(), NOW());

-- Insert sample ETL jobs
INSERT INTO etl_jobs (id, name, description, sourceId, targetId, query, transformRules, schedule, isActive, status, createdBy, createdAt, updatedAt) VALUES
('daily-sales-sync', 'Daily Sales Data Sync', 'Synchronizes sales data from production to analytics database', 'mysql-sales-db', 'postgres-analytics-db', 
'SELECT customer_id, order_date, amount, status FROM sales_orders WHERE order_date >= CURRENT_DATE - INTERVAL ''1 day''', 
'{"filter": {"status": "completed"}, "transform": {"amount": {"multiply": 1.0}}}', 
'0 2 * * *', true, 'PENDING', 'john-analyst-id', NOW(), NOW()),

('weekly-report-generation', 'Weekly Sales Report', 'Generates weekly sales report and stores in analytics', 'postgres-analytics-db', 'csv-reports-folder',
'SELECT DATE_TRUNC(''week'', order_date) as week, SUM(amount) as total_sales, COUNT(*) as order_count FROM sales_orders GROUP BY DATE_TRUNC(''week'', order_date) ORDER BY week DESC LIMIT 10',
'{"format": "csv", "include_headers": true}', 
'0 6 * * 1', true, 'PENDING', 'john-analyst-id', NOW(), NOW()),

('company-data-update', 'Company Information Sync', 'Updates company information from API to local database', 'api-company-data', 'postgres-analytics-db',
'GET /companies',
'{"transform": {"employees": {"to_int": true}, "revenue": {"to_float": true}}}', 
'0 */6 * * *', false, 'PAUSED', 'john-analyst-id', NOW(), NOW()),

('large-data-test', 'Large Dataset Processing', 'Tests performance with large dataset processing', 'mysql-sales-db', 'postgres-analytics-db',
'SELECT * FROM sales_orders WHERE created_at >= NOW() - INTERVAL ''30 days''',
'{"batch_size": 10000, "parallel_processing": true}', 
'', true, 'PENDING', 'bob-data-id', NOW(), NOW());

-- Insert sample job executions
INSERT INTO job_executions (id, jobId, status, startedAt, completedAt, recordsProcessed, recordsSuccess, recordsFailed, errorMessage, logs) VALUES
('exec-001', 'daily-sales-sync', 'COMPLETED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes', 1250, 1248, 2, NULL, 
'[{"timestamp": "2024-11-04T02:00:00Z", "level": "INFO", "message": "Started daily sales sync"}, {"timestamp": "2024-11-04T02:02:30Z", "level": "INFO", "message": "Processed 1250 records"}, {"timestamp": "2024-11-04T02:05:00Z", "level": "INFO", "message": "Sync completed successfully"}]'),

('exec-002', 'weekly-report-generation', 'COMPLETED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '10 minutes', 52, 52, 0, NULL,
'[{"timestamp": "2024-10-28T06:00:00Z", "level": "INFO", "message": "Started weekly report generation"}, {"timestamp": "2024-10-28T06:10:00Z", "level": "INFO", "message": "Generated 52 weeks of data"}]'),

('exec-003', 'large-data-test', 'FAILED', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '15 minutes', 50000, 45000, 5000, 'Memory allocation error: insufficient memory for large dataset processing',
'[{"timestamp": "2024-11-05T11:30:00Z", "level": "INFO", "message": "Started large data test"}, {"timestamp": "2024-11-05T11:45:00Z", "level": "ERROR", "message": "Out of memory error"}]');

-- Insert sample sync logs
INSERT INTO sync_logs (id, sourceId, jobId, level, message, details, timestamp) VALUES
('log-001', 'mysql-sales-db', 'daily-sales-sync', 'INFO', 'Connection established to MySQL database', '{"host": "mysql-server", "port": 3306, "database": "sales_db"}', NOW() - INTERVAL '1 day'),
('log-002', 'postgres-analytics-db', 'daily-sales-sync', 'INFO', 'Data transformation completed', '{"records_transformed": 1250, "processing_time": "2.5s"}', NOW() - INTERVAL '1 day'),
('log-003', 'mysql-sales-db', 'large-data-test', 'ERROR', 'Query execution failed', '{"error": "Query timeout after 30 seconds", "query": "SELECT * FROM sales_orders WHERE..."}', NOW() - INTERVAL '2 hours');

-- Insert sample notifications
INSERT INTO notifications (id, userId, type, title, message, isRead, sentAt) VALUES
('notif-001', 'john-analyst-id', 'JOB_SUCCESS', 'Daily Sales Sync Completed', 'The daily sales data synchronization completed successfully. 1,248 records processed.', true, NOW() - INTERVAL '1 day'),
('notif-002', 'john-analyst-id', 'JOB_FAILURE', 'Large Data Test Failed', 'The large dataset processing test failed due to insufficient memory. Please review system resources.', false, NOW() - INTERVAL '2 hours'),
('notif-003', 'admin-user-id', 'SYSTEM_ALERT', 'High Memory Usage Detected', 'System memory usage is above 85%. Consider scaling up resources.', false, NOW() - INTERVAL '1 hour'),
('notif-004', 'bob-data-id', 'JOB_SUCCESS', 'Weekly Report Generated', 'Weekly sales report has been generated and saved successfully.', true, NOW() - INTERVAL '7 days');

-- Insert sample system settings
INSERT INTO system_settings (id, key, value, description, updatedAt) VALUES
('sys-001', 'max_execution_time', '3600', 'Maximum job execution time in seconds (1 hour)', NOW()),
('sys-002', 'retry_attempts', '3', 'Number of retry attempts for failed jobs', NOW()),
('sys-003', 'notification_channels', '["email", "telegram", "in_app"]', 'Available notification channels', NOW()),
('sys-004', 'default_timezone', 'UTC', 'Default timezone for scheduling', NOW()),
('sys-005', 'backup_enabled', 'true', 'Enable automatic database backups', NOW()),
('sys-006', 'backup_schedule', '0 3 * * *', 'Backup schedule (daily at 3 AM)', NOW());

-- Sample test scenarios for different user roles

-- Scenario 1: Admin user creates a new data source
-- Expected: Admin can create any type of data source
-- Test API: POST /api/data-sources
/*
{
  "name": "Test MySQL Database",
  "type": "MYSQL",
  "connectionString": "mysql://testuser:testpass@localhost:3306/test_db",
  "description": "Test database for validation"
}
*/

-- Scenario 2: Regular user tries to create admin-only resource
-- Expected: Should fail with 403 Forbidden
-- Test API: POST /api/system-settings
/*
{
  "key": "test_setting",
  "value": "test_value"
}
*/

-- Scenario 3: User runs a job execution
-- Expected: User can execute jobs they created or have permission for
-- Test API: POST /api/jobs/{jobId}/run

-- Scenario 4: Viewer tries to execute a job
-- Expected: Should fail with 403 Forbidden
-- Test API: POST /api/jobs/{jobId}/run

-- Performance testing scenarios

-- Scenario 5: Load testing with concurrent job executions
-- Setup: Create multiple jobs with different data sizes
-- Test: Execute 10 jobs simultaneously
-- Expected: All jobs should complete within acceptable time limits

-- Scenario 6: Memory usage monitoring
-- Setup: Execute large dataset processing job
-- Monitor: Memory usage through /api/metrics endpoint
-- Expected: Memory usage should stay within configured limits

-- Scenario 7: Rate limiting test
-- Setup: Make 150 API requests within 1 minute
-- Expected: Requests after 100 should be rate limited (429)

-- Scenario 8: Cache performance test
-- Setup: Make same API request multiple times
-- Expected: Second and subsequent requests should be faster due to caching

-- Scenario 9: Database connection pool test
-- Setup: Execute 20 concurrent database operations
-- Expected: All operations should complete without connection errors

-- Scenario 10: WebSocket real-time updates test
-- Setup: Subscribe to job execution updates
-- Expected: Should receive real-time updates during job execution

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON etl_jobs(createdBy);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON etl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_executions_job_id ON job_executions(jobId);
CREATE INDEX IF NOT EXISTS idx_executions_status ON job_executions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(isRead);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source_id ON sync_logs(sourceId);
CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp);

-- Create views for common queries
CREATE OR REPLACE VIEW job_summary AS
SELECT 
  j.id,
  j.name,
  j.status,
  j.createdBy,
  u.name as createdByName,
  j.createdAt,
  COUNT(e.id) as total_executions,
  SUM(e.recordsSuccess) as total_records_processed,
  MAX(e.startedAt) as last_execution
FROM etl_jobs j
LEFT JOIN users u ON j.createdBy = u.id
LEFT JOIN job_executions e ON j.id = e.jobId
GROUP BY j.id, j.name, j.status, j.createdBy, u.name, j.createdAt;

-- Create function for getting user dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard_data(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_jobs', (SELECT COUNT(*) FROM etl_jobs WHERE createdBy = user_uuid),
    'active_jobs', (SELECT COUNT(*) FROM etl_jobs WHERE createdBy = user_uuid AND status = 'RUNNING'),
    'recent_executions', (
      SELECT json_agg(
        json_build_object(
          'id', e.id,
          'job_name', j.name,
          'status', e.status,
          'started_at', e.startedAt,
          'records_processed', e.recordsProcessed
        )
      )
      FROM job_executions e
      JOIN etl_jobs j ON e.jobId = j.id
      WHERE j.createdBy = user_uuid
      ORDER BY e.startedAt DESC
      LIMIT 10
    ),
    'notifications', (
      SELECT COUNT(*) FROM notifications WHERE userId = user_uuid AND isRead = false
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to users based on their roles
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO etl_user;

-- Set up row-level security (if needed)
-- ALTER TABLE etl_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE etl_jobs IS 'ETL job definitions with scheduling and transformation rules';
COMMENT ON TABLE job_executions IS 'Individual job execution records with performance metrics';
COMMENT ON TABLE data_sources IS 'Data source configurations for various types of databases and APIs';
COMMENT ON TABLE notifications IS 'System notifications sent to users';
COMMENT ON FUNCTION get_user_dashboard_data(UUID) IS 'Returns dashboard data for a specific user';