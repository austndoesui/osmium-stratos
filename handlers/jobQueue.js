const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.processing = new Set();
    this.maxConcurrentJobs = 3; // Limit concurrent heavy operations
    this.jobId = 0;
  }

  /**
   * Add a job to the queue
   * @param {string} type - Job type (e.g., 'create_instance', 'migrate_instance')
   * @param {object} data - Job data
   * @param {function} processor - Function to execute the job
   * @param {object} options - Job options
   */
  addJob(type, data, processor, options = {}) {
    const jobId = `${type}_${++this.jobId}_${Date.now()}`;
    const job = {
      id: jobId,
      type,
      data,
      processor,
      status: 'pending',
      createdAt: new Date(),
      priority: options.priority || 0,
      maxRetries: options.maxRetries || 3,
      retryCount: 0,
      result: null,
      error: null,
      progress: 0
    };

    this.jobs.set(jobId, job);
    this.emit('jobAdded', job);
    
    // Start processing if not at max capacity
    this.processNext();
    
    return jobId;
  }

  /**
   * Process the next job in queue
   */
  async processNext() {
    if (this.processing.size >= this.maxConcurrentJobs) {
      return; // At max capacity
    }

    // Find highest priority pending job
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => b.priority - a.priority);

    if (pendingJobs.length === 0) {
      return; // No pending jobs
    }

    const job = pendingJobs[0];
    await this.processJob(job);
  }

  /**
   * Process a specific job
   */
  async processJob(job) {
    if (this.processing.has(job.id)) {
      return; // Already processing
    }

    this.processing.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();

    this.emit('jobStarted', job);

    try {
      console.log(`🔄 Processing job: ${job.id} (${job.type})`);
      
      // Execute the job processor
      const result = await job.processor(job.data, (progress) => {
        job.progress = progress;
        this.emit('jobProgress', job);
      });

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.progress = 100;

      console.log(`✅ Job completed: ${job.id}`);
      this.emit('jobCompleted', job);

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error);
      
      job.error = error.message;
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        job.status = 'pending'; // Retry
        console.log(`🔄 Retrying job: ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries})`);
        this.emit('jobRetry', job);
      } else {
        job.status = 'failed';
        job.failedAt = new Date();
        this.emit('jobFailed', job);
      }
    } finally {
      this.processing.delete(job.id);
      
      // Process next job
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs with optional filter
   */
  getJobs(filter = {}) {
    let jobs = Array.from(this.jobs.values());
    
    if (filter.status) {
      jobs = jobs.filter(job => job.status === filter.status);
    }
    
    if (filter.type) {
      jobs = jobs.filter(job => job.type === filter.type);
    }
    
    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      this.emit('jobCancelled', job);
      return true;
    }
    return false;
  }

  /**
   * Clean up old completed/failed jobs
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    const toDelete = [];

    for (const [jobId, job] of this.jobs) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') 
          && job.createdAt < cutoff) {
        toDelete.push(jobId);
      }
    }

    toDelete.forEach(jobId => this.jobs.delete(jobId));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} old jobs`);
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      maxConcurrent: this.maxConcurrentJobs,
      currentlyProcessing: this.processing.size
    };
  }
}

// Create global job queue instance
const jobQueue = new JobQueue();

// Cleanup old jobs every hour
setInterval(() => {
  jobQueue.cleanup();
}, 60 * 60 * 1000);

// Job processors for heavy operations
const jobProcessors = {
  /**
   * Instance creation job processor
   */
  async createInstance(data, progressCallback) {
    const { host, instanceConfig, userId } = data;
    
    progressCallback(10);
    
    // Create instance via LXD
    const result = await new Promise((resolve, reject) => {
      const instance = require('../modules/instance');
      instance.createVM(host, instanceConfig, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    progressCallback(60);
    
    // Save to database
    const { prisma } = require('./prisma');
    const instanceRecord = await prisma.instance.create({
      data: {
        name: instanceConfig.name,
        hostId: host.id,
        lxdName: instanceConfig.name,
        userId: userId || null,
        cpu: instanceConfig.cpu || null,
        ram: instanceConfig.ram || null,
        disk: instanceConfig.disk || null,
        imageAlias: instanceConfig.imageAlias,
      },
    });
    
    progressCallback(90);
    
    // Invalidate caches
    const { invalidateCache } = require('./cache');
    invalidateCache(/^vms:/);
    
    progressCallback(100);
    
    return {
      lxdResult: result,
      instanceId: instanceRecord.id,
      message: 'Instance created successfully'
    };
  },

  /**
   * Instance migration job processor
   */
  async migrateInstance(data, progressCallback) {
    const { sourceHostId, targetHostId, instanceName } = data;
    
    progressCallback(5);
    
    const { migrateInstance } = require('../modules/migrate');
    const result = await migrateInstance({
      sourceHostId,
      targetHostId,
      instanceName,
      onProgress: progressCallback
    });
    
    // Invalidate caches
    const { invalidateCache } = require('./cache');
    invalidateCache(/^vms:/);
    invalidateCache(new RegExp(`^vm:${sourceHostId}:${instanceName}`));
    invalidateCache(new RegExp(`^vm:${targetHostId}:${instanceName}`));
    
    return result;
  },

  /**
   * Bulk operations processor
   */
  async bulkOperation(data, progressCallback) {
    const { operations, type } = data;
    const results = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const progress = ((i + 1) / operations.length) * 100;
      
      try {
        let result;
        switch (type) {
          case 'start':
            result = await new Promise((resolve, reject) => {
              const instance = require('../modules/instance');
              instance.startInstance(operation.host, operation.instanceName, (err, res) => {
                if (err) reject(err);
                else resolve(res);
              });
            });
            break;
          case 'stop':
            result = await new Promise((resolve, reject) => {
              const instance = require('../modules/instance');
              instance.stopInstance(operation.host, operation.instanceName, (err, res) => {
                if (err) reject(err);
                else resolve(res);
              });
            });
            break;
          default:
            throw new Error(`Unknown bulk operation type: ${type}`);
        }
        
        results.push({ operation, result, success: true });
      } catch (error) {
        results.push({ operation, error: error.message, success: false });
      }
      
      progressCallback(progress);
    }
    
    return results;
  }
};

module.exports = {
  jobQueue,
  jobProcessors,
  JobQueue
};