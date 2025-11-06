-- Banking-Grade ETL Enhancements Migration
-- Supports immutable audit trails, transaction integrity, and financial compliance

-- Create immutable audit table for financial compliance
CREATE TABLE IF NOT EXISTS immutable_audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    execution_id TEXT,
    transaction_id TEXT, -- Unique identifier for each transaction batch
    event_type TEXT NOT NULL, -- BATCH_STARTED, BATCH_COMPLETED, TRANSACTION_COMMITTED, etc.
    event_data TEXT NOT NULL, -- JSON string with detailed event information
    hash_signature TEXT NOT NULL, -- SHA-256 hash for integrity verification
    previous_hash TEXT, -- Chain of custody for audit trail
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT NOT NULL, -- For data integrity validation
    
    -- Financial compliance fields
    amount_total DECIMAL(20,2),
    currency TEXT DEFAULT 'USD',
    record_count INTEGER,
    checksum_records TEXT,
    
    FOREIGN KEY (job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE CASCADE
);

-- Create transaction integrity table
CREATE TABLE IF NOT EXISTS transaction_integrity (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    job_id TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    checksum_batch TEXT NOT NULL, -- Hash of all records in this batch
    records_validated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    validation_status TEXT DEFAULT 'PENDING', -- PENDING, VALIDATED, FAILED
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    failure_reason TEXT,
    
    FOREIGN KEY (job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE CASCADE
);

-- Create dead letter queue for failed transactions
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    execution_id TEXT,
    transaction_id TEXT,
    failure_type TEXT NOT NULL, -- VALIDATION_ERROR, PROCESSING_ERROR, SYSTEM_ERROR
    failure_reason TEXT NOT NULL,
    payload_data TEXT NOT NULL, -- Original failing data
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    next_retry_at DATETIME,
    
    FOREIGN KEY (job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE CASCADE
);

-- Create circuit breaker state tracking
CREATE TABLE IF NOT EXISTS circuit_breaker_states (
    id TEXT PRIMARY KEY NOT NULL,
    service_name TEXT NOT NULL UNIQUE, -- Database, External API, etc.
    state TEXT NOT NULL DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    failure_count INTEGER DEFAULT 0,
    last_failure_time DATETIME,
    recovery_timeout INTEGER DEFAULT 60, -- seconds
    success_threshold INTEGER DEFAULT 3,
    failure_threshold INTEGER DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create performance metrics table for banking requirements
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- THROUGHPUT, LATENCY, MEMORY, ERROR_RATE
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(20,8) NOT NULL,
    unit TEXT NOT NULL, -- records/sec, ms, MB, percentage
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tags TEXT, -- JSON string for additional metric tags
    
    FOREIGN KEY (job_id) REFERENCES etl_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE CASCADE
);

-- Create enhanced job execution table with banking fields
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS financial_amount DECIMAL(20,2);
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS checksum_records TEXT;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS records_validated INTEGER DEFAULT 0;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS processing_start_time DATETIME;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS processing_end_time DATETIME;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS memory_peak_mb DECIMAL(10,2);
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS throughput_records_per_sec DECIMAL(10,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_immutable_audit_timestamp ON immutable_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_job_id ON immutable_audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_transaction_id ON immutable_audit_log(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_integrity_job_id ON transaction_integrity(job_id);
CREATE INDEX IF NOT EXISTS idx_transaction_integrity_status ON transaction_integrity(validation_status);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_status ON dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_job_id ON dead_letter_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_next_retry ON dead_letter_queue(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_job_id ON performance_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_service ON circuit_breaker_states(service_name);

-- Insert initial circuit breaker states
INSERT OR REPLACE INTO circuit_breaker_states (id, service_name, state, failure_count, last_failure_time, created_at, updated_at) VALUES
('cb_database', 'database', 'CLOSED', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cb_external_api', 'external_api', 'CLOSED', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cb_memory', 'memory_management', 'CLOSED', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create enhanced ETL job table with banking fields
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS data_classification TEXT DEFAULT 'PUBLIC'; -- PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS retention_period_days INTEGER DEFAULT 2555; -- 7 years default for financial data
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS encryption_required BOOLEAN DEFAULT false;
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS compliance_requirements TEXT; -- JSON string for compliance requirements
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW'; -- LOW, MEDIUM, HIGH, CRITICAL
ALTER TABLE etl_jobs ADD COLUMN IF NOT EXISTS data_volume_threshold_mb INTEGER DEFAULT 1000;

-- Create trigger for audit log hash chain maintenance
CREATE TRIGGER IF NOT EXISTS update_audit_hash_chain
AFTER INSERT ON immutable_audit_log
BEGIN
    UPDATE immutable_audit_log 
    SET previous_hash = (
        SELECT hash_signature 
        FROM immutable_audit_log 
        WHERE id = (
            SELECT MAX(id) FROM immutable_audit_log 
            WHERE job_id = NEW.job_id AND id < NEW.id
        )
    )
    WHERE id = NEW.id;
END;

-- Create function to calculate checksums
CREATE TABLE IF NOT EXISTS system_settings_new (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings for banking requirements
INSERT OR REPLACE INTO system_settings_new (id, key, value, description) VALUES
('ss_banking_mode', 'true', '{"enabled": true, "audit_required": true, "immutable_logs": true}', 'Enable banking-grade features'),
('ss_default_currency', 'USD', '{"default": "USD", "supported": ["USD", "EUR", "GBP", "JPY"]}', 'Default currency for financial operations'),
('ss_max_concurrent_jobs', '10', '{"max_concurrent": 10, "max_memory_mb": 2048}', 'Resource limits for job execution'),
('ss_circuit_breaker_timeout', '60', '{"default_timeout": 60, "failure_threshold": 5}', 'Circuit breaker configuration'),
('ss_data_retention_days', '2555', '{"financial_data": 2555, "logs": 90}', 'Data retention policies');