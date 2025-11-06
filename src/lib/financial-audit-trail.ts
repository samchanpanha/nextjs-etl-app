/**
 * Banking-Grade Immutable Audit Trail System
 * Provides tamper-evident audit logging with cryptographic integrity for financial compliance
 */

import BankingTransactionManager from './banking-transaction-manager'
import BankingMonitor from './banking-monitor'

export interface AuditEntry {
  id: string
  timestamp: Date
  eventType: string
  entityId: string
  entityType: string
  actor: string
  action: string
  resource: string
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING'
  details: Record<string, any>
  signature: string
  previousHash: string
  chainHash: string
}

export interface ComplianceRule {
  ruleId: string
  name: string
  description: string
  complianceFramework: 'SOX' | 'PCI-DSS' | 'BASEL_III' | 'GDPR' | 'FINRA' | 'SEC' | 'AML' | 'KYC'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresFullTrail: boolean
  retentionPeriodYears: number
  validationCriteria: Record<string, any>
}

export interface RegulatoryReport {
  reportId: string
  framework: string
  period: {
    startDate: Date
    endDate: Date
  }
  generatedAt: Date
  totalEntries: number
  summary: {
    totalTransactions: number
    totalAmount: number
    errorCount: number
    complianceScore: number
  }
  findings: Array<{
    severity: string
    category: string
    description: string
    evidence: string[]
    recommendation: string
  }>
  signatures: {
    system: string
    reviewer: string
    validator: string
  }
  integrityHash: string
}

export interface FinancialEvent {
  eventId: string
  transactionId?: string
  accountId?: string
  userId?: string
  amount?: number
  currency: string
  eventType: 'TRANSACTION' | 'TRANSFER' | 'PAYMENT' | 'REFUND' | 'FEE' | 'INTEREST' | 'CHARGEBACK'
  timestamp: Date
  metadata: Record<string, any>
  riskScore?: number
  complianceFlags: string[]
}

export class FinancialAuditTrail {
  private static instance: FinancialAuditTrail
  private readonly bankingManager: BankingTransactionManager
  private readonly monitor: BankingMonitor
  private readonly complianceRules: Map<string, ComplianceRule>
  private auditChain: AuditEntry[] = []
  private readonly maxChainLength = 1000000
  private readonly digitalSignatureAlgorithm = 'ECDSA-SHA256'
  
  // Regulatory compliance configurations
  private readonly complianceFrameworks = {
    'SOX': { retentionYears: 7, requiresEncryption: true, auditFrequency: 'DAILY' },
    'PCI-DSS': { retentionYears: 1, requiresEncryption: true, auditFrequency: 'REAL_TIME' },
    'BASEL_III': { retentionYears: 10, requiresEncryption: true, auditFrequency: 'WEEKLY' },
    'GDPR': { retentionYears: 7, requiresEncryption: true, auditFrequency: 'REAL_TIME' },
    'AML': { retentionYears: 5, requiresEncryption: true, auditFrequency: 'DAILY' },
    'FINRA': { retentionYears: 6, requiresEncryption: true, auditFrequency: 'WEEKLY' }
  }

  private constructor() {
    this.bankingManager = BankingTransactionManager.getInstance()
    this.monitor = BankingMonitor.getInstance()
    this.complianceRules = new Map()
    this.initializeComplianceRules()
  }

  static getInstance(): FinancialAuditTrail {
    if (!FinancialAuditTrail.instance) {
      FinancialAuditTrail.instance = new FinancialAuditTrail()
    }
    return FinancialAuditTrail.instance
  }

  /**
   * Record a financial event with full audit trail
   */
  async recordFinancialEvent(event: FinancialEvent): Promise<string> {
    const auditId = await this.createAuditEntry({
      eventType: 'FINANCIAL_EVENT',
      entityId: event.transactionId || event.accountId || event.eventId,
      entityType: 'TRANSACTION',
      actor: event.userId || 'SYSTEM',
      action: event.eventType,
      resource: `financial_event:${event.eventId}`,
      outcome: 'SUCCESS',
      details: {
        eventType: event.eventType,
        amount: event.amount,
        currency: event.currency,
        metadata: event.metadata,
        riskScore: event.riskScore,
        complianceFlags: event.complianceFlags,
        eventTimestamp: event.timestamp.toISOString()
      }
    })

    // Record compliance checks
    await this.performComplianceChecks(event, auditId)

    // Record financial metrics
    if (event.amount) {
      await this.monitor.recordBusinessMetric({
        category: 'FINANCIAL',
        name: 'transaction_amount',
        value: event.amount,
        unit: event.currency,
        timestamp: Date.now(),
        metadata: {
          eventId: event.eventId,
          eventType: event.eventType,
          complianceFlags: event.complianceFlags
        }
      })
    }

    // Alert on high-risk transactions
    if (event.riskScore && event.riskScore > 0.8) {
      await this.monitor.recordBusinessMetric({
        category: 'ERROR_RATE',
        name: 'high_risk_transaction',
        value: 1,
        unit: 'alert',
        timestamp: Date.now(),
        metadata: { 
          eventId: event.eventId, 
          riskScore: event.riskScore,
          complianceFlags: event.complianceFlags 
        }
      })
    }

    return auditId
  }

  /**
   * Create an immutable audit entry with cryptographic integrity
   */
  private async createAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'signature' | 'previousHash' | 'chainHash'>): Promise<string> {
    const auditId = this.generateId()
    const timestamp = new Date()
    
    // Get previous entry for chain integrity
    const previousEntry = this.auditChain[this.auditChain.length - 1]
    const previousHash = previousEntry ? previousEntry.chainHash : ''
    
    // Create entry data
    const entryData = {
      id: auditId,
      timestamp: timestamp.toISOString(),
      ...entry
    }
    
    // Calculate chain hash
    const chainData = JSON.stringify(entryData) + previousHash
    const chainHash = await this.calculateHash(chainData)
    
    // Create signature (simplified - would use proper digital signatures in production)
    const signature = await this.calculateSignature(chainHash)
    
    // Create audit entry
    const auditEntry: AuditEntry = {
      ...entry,
      id: auditId,
      timestamp,
      signature,
      previousHash,
      chainHash
    }
    
    // Add to chain
    this.auditChain.push(auditEntry)
    
    // Maintain chain length
    if (this.auditChain.length > this.maxChainLength) {
      this.auditChain.shift()
    }
    
    // Store in banking transaction manager for persistence
    await this.bankingManager.createAuditEntry(
      entry.entityId,
      entry.action,
      entry.details,
      undefined,
      entry.resource
    )

    return auditId
  }

  /**
   * Validate audit trail integrity
   */
  async validateAuditTrail(startDate?: Date, endDate?: Date): Promise<{
    isValid: boolean
    corruptedEntries: string[]
    integrityScore: number
    chainLength: number
    violations: Array<{
      entryId: string
      violation: string
      severity: string
    }>
  }> {
    const violations: Array<{ entryId: string; violation: string; severity: string }> = []
    let corruptedEntries: string[] = []
    let validEntries = 0

    // Filter entries by date range if specified
    let entriesToValidate = this.auditChain
    if (startDate || endDate) {
      entriesToValidate = this.auditChain.filter(entry => {
        const entryTime = entry.timestamp.getTime()
        return (!startDate || entryTime >= startDate.getTime()) &&
               (!endDate || entryTime <= endDate.getTime())
      })
    }

    // Validate each entry
    for (let i = 0; i < entriesToValidate.length; i++) {
      const entry = entriesToValidate[i]
      const isValid = await this.validateEntry(entry, i > 0 ? entriesToValidate[i - 1] : null)
      
      if (isValid) {
        validEntries++
      } else {
        corruptedEntries.push(entry.id)
        violations.push({
          entryId: entry.id,
          violation: 'Hash verification failed',
          severity: 'CRITICAL'
        })
      }
    }

    // Check for missing entries
    const expectedLength = entriesToValidate.length
    const actualLength = validEntries
    if (expectedLength !== actualLength) {
      violations.push({
        entryId: 'CHAIN',
        violation: `Audit trail length mismatch: expected ${expectedLength}, found ${actualLength}`,
        severity: 'HIGH'
      })
    }

    const integrityScore = entriesToValidate.length > 0 ? validEntries / entriesToValidate.length : 1.0

    return {
      isValid: violations.length === 0,
      corruptedEntries,
      integrityScore: Math.round(integrityScore * 10000) / 10000,
      chainLength: entriesToValidate.length,
      violations
    }
  }

  /**
   * Generate regulatory compliance report
   */
  async generateComplianceReport(
    framework: string,
    startDate: Date,
    endDate: Date
  ): Promise<RegulatoryReport> {
    // Get applicable compliance rule
    const rule = this.getComplianceRule(framework)
    if (!rule) {
      throw new Error(`Compliance framework ${framework} not supported`)
    }

    // Filter audit entries by date range
    const entries = this.auditChain.filter(entry => {
      const entryTime = entry.timestamp.getTime()
      return entryTime >= startDate.getTime() && entryTime <= endDate.getTime()
    })

    // Analyze entries for compliance
    const findings = await this.analyzeCompliance(entries, rule)
    
    // Calculate summary statistics
    const financialEntries = entries.filter(e => e.details.amount)
    const totalTransactions = financialEntries.length
    const totalAmount = financialEntries.reduce((sum, e) => sum + (e.details.amount || 0), 0)
    const errorCount = entries.filter(e => e.outcome === 'FAILURE').length
    const complianceScore = entries.length > 0 ? 
      (entries.filter(e => e.outcome === 'SUCCESS').length / entries.length) * 100 : 100

    // Generate signatures
    const signatures = await this.generateReportSignatures(framework, totalTransactions, totalAmount, complianceScore)
    
    // Calculate integrity hash
    const reportData = JSON.stringify({
      framework,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTransactions,
      totalAmount,
      errorCount,
      complianceScore,
      findings: findings.map(f => ({ ...f, evidence: undefined })) // Remove evidence for hash
    })
    const integrityHash = await this.calculateHash(reportData)

    const report: RegulatoryReport = {
      reportId: this.generateId(),
      framework,
      period: { startDate, endDate },
      generatedAt: new Date(),
      totalEntries: entries.length,
      summary: {
        totalTransactions,
        totalAmount,
        errorCount,
        complianceScore
      },
      findings,
      signatures,
      integrityHash
    }

    // Record report generation
    await this.monitor.recordBusinessMetric({
      category: 'ERROR_RATE',
      name: 'compliance_report_generated',
      value: 1,
      unit: 'report',
      timestamp: Date.now(),
      metadata: {
        framework,
        totalEntries: entries.length,
        complianceScore
      }
    })

    return report
  }

  /**
   * Perform real-time compliance checks
   */
  private async performComplianceChecks(event: FinancialEvent, auditId: string): Promise<void> {
    const checks = [
      this.checkAMLCompliance(event),
      this.checkKYCCompliance(event),
      this.checkTransactionLimits(event),
      this.checkSuspiciousActivity(event)
    ]

    for (const check of checks) {
      try {
        const result = await check
        if (!result.compliant) {
          await this.createComplianceAlert(event, result, auditId)
        }
      } catch (error) {
        console.error('Compliance check failed:', error)
      }
    }
  }

  /**
   * AML (Anti-Money Laundering) compliance check
   */
  private async checkAMLCompliance(event: FinancialEvent): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = []
    
    // Check for high-value transactions
    if (event.amount && event.amount > 10000) {
      violations.push('High-value transaction requires enhanced due diligence')
    }
    
    // Check for structuring patterns (multiple transactions just below reporting threshold)
    // This would require historical analysis in a real implementation
    if (event.metadata?.structuredTransaction) {
      violations.push('Potential structuring detected')
    }
    
    // Check for high-risk jurisdictions
    if (event.metadata?.highRiskJurisdiction) {
      violations.push('High-risk jurisdiction involved')
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * KYC (Know Your Customer) compliance check
   */
  private async checkKYCCompliance(event: FinancialEvent): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = []
    
    // Check if customer is properly verified
    if (!event.metadata?.customerVerified) {
      violations.push('Customer identity not verified')
    }
    
    // Check for PEP (Politically Exposed Person)
    if (event.metadata?.isPEP) {
      violations.push('Politically Exposed Person - enhanced due diligence required')
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * Transaction limits compliance check
   */
  private async checkTransactionLimits(event: FinancialEvent): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = []
    
    if (event.amount) {
      // Daily limits
      const dailyLimit = event.metadata?.dailyLimit || 50000
      if (event.amount > dailyLimit) {
        violations.push(`Transaction amount exceeds daily limit of $${dailyLimit}`)
      }
      
      // Monthly limits
      const monthlyLimit = event.metadata?.monthlyLimit || 500000
      if (event.amount > monthlyLimit) {
        violations.push(`Transaction amount exceeds monthly limit of $${monthlyLimit}`)
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * Suspicious activity detection
   */
  private async checkSuspiciousActivity(event: FinancialEvent): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = []
    
    // Unusual transaction patterns
    if (event.metadata?.unusualPattern) {
      violations.push('Unusual transaction pattern detected')
    }
    
    // Rapid sequence of transactions
    if (event.metadata?.rapidSequence) {
      violations.push('Rapid sequence of transactions detected')
    }
    
    // Cross-border activity
    if (event.metadata?.crossBorder && !event.metadata?.approvedCrossBorder) {
      violations.push('Cross-border transaction without proper approval')
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * Create compliance alert
   */
  private async createComplianceAlert(
    event: FinancialEvent,
    checkResult: { compliant: boolean; violations: string[] },
    auditId: string
  ): Promise<void> {
    const alertId = this.generateId()
    
    await this.bankingManager.createAuditEntry(
      event.transactionId || event.eventId,
      'COMPLIANCE_VIOLATION',
      {
        alertId,
        eventId: event.eventId,
        violations: checkResult.violations,
        amount: event.amount,
        currency: event.currency,
        timestamp: event.timestamp.toISOString()
      },
      undefined,
      auditId
    )

    // Record in monitoring system
    await this.monitor.recordBusinessMetric({
      category: 'ERROR_RATE',
      name: 'compliance_violation',
      value: 1,
      unit: 'violation',
      timestamp: Date.now(),
      metadata: {
        eventId: event.eventId,
        violations: checkResult.violations,
        amount: event.amount,
        currency: event.currency
      }
    })
  }

  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules(): void {
    const rules: ComplianceRule[] = [
      {
        ruleId: 'AML-001',
        name: 'Anti-Money Laundering Monitoring',
        description: 'Monitor transactions for suspicious money laundering activities',
        complianceFramework: 'AML',
        severity: 'CRITICAL',
        requiresFullTrail: true,
        retentionPeriodYears: 5,
        validationCriteria: {
          highValueThreshold: 10000,
          rapidTransactionThreshold: 5,
          timeWindow: 3600 // 1 hour in seconds
        }
      },
      {
        ruleId: 'KYC-001',
        name: 'Know Your Customer Verification',
        description: 'Ensure proper customer identity verification',
        complianceFramework: 'KYC',
        severity: 'HIGH',
        requiresFullTrail: true,
        retentionPeriodYears: 7,
        validationCriteria: {
          requiresIdentityVerification: true,
          requiresAddressVerification: true,
          requiresSourceOfFunds: true
        }
      },
      {
        ruleId: 'SOX-001',
        name: 'Sarbanes-Oxley Financial Controls',
        description: 'Ensure financial controls and reporting compliance',
        complianceFramework: 'SOX',
        severity: 'HIGH',
        requiresFullTrail: true,
        retentionPeriodYears: 7,
        validationCriteria: {
          requiresDualAuthorization: true,
          requiresAuditTrail: true,
          requiresReconciliation: true
        }
      },
      {
        ruleId: 'PCI-001',
        name: 'Payment Card Industry Data Security',
        description: 'Protect payment card data and ensure PCI compliance',
        complianceFramework: 'PCI-DSS',
        severity: 'CRITICAL',
        requiresFullTrail: true,
        retentionPeriodYears: 1,
        validationCriteria: {
          requiresEncryption: true,
          requiresAccessControls: true,
          requiresNetworkMonitoring: true
        }
      }
    ]

    for (const rule of rules) {
      this.complianceRules.set(rule.ruleId, rule)
    }
  }

  /**
   * Get compliance rule by framework
   */
  private getComplianceRule(framework: string): ComplianceRule | undefined {
    return Array.from(this.complianceRules.values()).find(rule => rule.complianceFramework === framework)
  }

  /**
   * Analyze entries for compliance
   */
  private async analyzeCompliance(entries: AuditEntry[], rule: ComplianceRule): Promise<RegulatoryReport['findings']> {
    const findings: RegulatoryReport['findings'] = []
    
    // Financial analysis
    const financialEntries = entries.filter(e => e.details.amount)
    const totalAmount = financialEntries.reduce((sum, e) => sum + (e.details.amount || 0), 0)
    
    // Check for high-value transactions
    const highValueEntries = financialEntries.filter(e => (e.details.amount || 0) > rule.validationCriteria.highValueThreshold)
    if (highValueEntries.length > 0) {
      findings.push({
        severity: 'HIGH',
        category: 'HIGH_VALUE_TRANSACTIONS',
        description: `${highValueEntries.length} transactions exceed high-value threshold`,
        evidence: highValueEntries.slice(0, 5).map(e => e.id),
        recommendation: 'Review and document justification for high-value transactions'
      })
    }
    
    // Check for failed transactions
    const failedEntries = entries.filter(e => e.outcome === 'FAILURE')
    if (failedEntries.length > entries.length * 0.05) { // More than 5% failure rate
      findings.push({
        severity: 'MEDIUM',
        category: 'HIGH_FAILURE_RATE',
        description: `Failure rate of ${Math.round((failedEntries.length / entries.length) * 100)}% exceeds acceptable threshold`,
        evidence: failedEntries.slice(0, 3).map(e => e.id),
        recommendation: 'Investigate root causes of transaction failures'
      })
    }
    
    // Compliance framework specific checks
    if (rule.complianceFramework === 'AML') {
      const amlFindings = await this.analyzeAMLCompliance(entries)
      findings.push(...amlFindings)
    } else if (rule.complianceFramework === 'PCI-DSS') {
      const pciFindings = await this.analyzePCICompliance(entries)
      findings.push(...pciFindings)
    }

    return findings
  }

  /**
   * Analyze AML compliance
   */
  private async analyzeAMLCompliance(entries: AuditEntry[]): Promise<RegulatoryReport['findings']> {
    const findings: RegulatoryReport['findings'] = []
    
    // Check for rapid transactions (potential structuring)
    const timeStamps = entries.map(e => e.timestamp.getTime()).sort((a, b) => a - b)
    for (let i = 1; i < timeStamps.length; i++) {
      const timeDiff = (timeStamps[i] - timeStamps[i-1]) / 1000 // seconds
      if (timeDiff < 60) { // Less than 1 minute between transactions
        findings.push({
          severity: 'HIGH',
          category: 'RAPID_TRANSACTIONS',
          description: 'Rapid sequence of transactions detected - potential structuring',
          evidence: [entries[i-1].id, entries[i].id],
          recommendation: 'Review transactions for potential money laundering activities'
        })
        break
      }
    }

    return findings
  }

  /**
   * Analyze PCI-DSS compliance
   */
  private async analyzePCICompliance(entries: AuditEntry[]): Promise<RegulatoryReport['findings']> {
    const findings: RegulatoryReport['findings'] = []
    
    // Check for unencrypted sensitive data
    const sensitiveEntries = entries.filter(e => 
      e.details.metadata?.containsCardData && !e.details.metadata?.encrypted
    )
    
    if (sensitiveEntries.length > 0) {
      findings.push({
        severity: 'CRITICAL',
        category: 'UNENCRYPTED_CARD_DATA',
        description: 'Unencrypted payment card data detected',
        evidence: sensitiveEntries.slice(0, 3).map(e => e.id),
        recommendation: 'Implement immediate data encryption and secure transmission protocols'
      })
    }

    return findings
  }

  /**
   * Generate report signatures
   */
  private async generateReportSignatures(framework: string, transactions: number, amount: number, score: number): Promise<RegulatoryReport['signatures']> {
    // In production, these would be proper digital signatures using HSM or similar
    const systemSignature = await this.calculateSignature(`SYSTEM:${framework}:${transactions}:${amount}:${score}`)
    const reviewerSignature = await this.calculateSignature(`REVIEWER:${framework}:${transactions}:${amount}:${score}`)
    const validatorSignature = await this.calculateSignature(`VALIDATOR:${framework}:${transactions}:${amount}:${score}`)
    
    return {
      system: systemSignature,
      reviewer: reviewerSignature,
      validator: validatorSignature
    }
  }

  /**
   * Validate individual audit entry
   */
  private async validateEntry(entry: AuditEntry, previousEntry: AuditEntry | null): Promise<boolean> {
    try {
      // Verify chain integrity
      if (previousEntry && entry.previousHash !== previousEntry.chainHash) {
        return false
      }
      
      // Verify signature
      const expectedSignature = await this.calculateSignature(entry.chainHash)
      if (entry.signature !== expectedSignature) {
        return false
      }
      
      // Verify hash integrity
      const entryData = {
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        eventType: entry.eventType,
        entityId: entry.entityId,
        entityType: entry.entityType,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        outcome: entry.outcome,
        details: entry.details,
        signature: entry.signature,
        previousHash: entry.previousHash
      }
      const expectedChainHash = await this.calculateHash(JSON.stringify(entryData) + entry.previousHash)
      if (entry.chainHash !== expectedChainHash) {
        return false
      }
      
      return true
    } catch (error) {
      console.error('Entry validation failed:', error)
      return false
    }
  }

  /**
   * Calculate hash using Web Crypto API
   */
  private async calculateHash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Calculate digital signature (simplified)
   */
  private async calculateSignature(data: string): Promise<string> {
    // In production, this would use proper digital signatures (ECDSA, RSA, etc.)
    const hash = await this.calculateHash(data)
    return `SIG_${hash.substring(0, 16)}`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get audit trail summary for reporting
   */
  async getAuditTrailSummary(startDate?: Date, endDate?: Date): Promise<{
    totalEntries: number
    financialEvents: number
    complianceViolations: number
    averageIntegrityScore: number
    frameworks: string[]
    period: { start?: Date; end?: Date }
  }> {
    let entries = this.auditChain
    
    if (startDate || endDate) {
      entries = entries.filter(entry => {
        const entryTime = entry.timestamp.getTime()
        return (!startDate || entryTime >= startDate.getTime()) &&
               (!endDate || entryTime <= endDate.getTime())
      })
    }

    const validation = await this.validateAuditTrail(startDate, endDate)
    const financialEvents = entries.filter(e => e.eventType === 'FINANCIAL_EVENT').length
    const complianceViolations = entries.filter(e => e.action === 'COMPLIANCE_VIOLATION').length

    // Extract compliance frameworks from rules
    const frameworks = Array.from(new Set(
      Array.from(this.complianceRules.values()).map(r => r.complianceFramework)
    ))

    return {
      totalEntries: entries.length,
      financialEvents,
      complianceViolations,
      averageIntegrityScore: validation.integrityScore * 100,
      frameworks,
      period: { start: startDate, end: endDate }
    }
  }
}

export default FinancialAuditTrail