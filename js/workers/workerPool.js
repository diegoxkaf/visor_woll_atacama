/**
 * workerPool.js
 * Gestiona un pool de Web Workers para evitar la creación y destrucción constante.
 * @module utils/workerPool
 */

const POOL_SIZE = 4;
const workers = [];
const taskQueue = [];

export function initWorkerPool() {
    if (workers.length > 0) return;
    const workerUrl = new URL("./layerProcessor.worker.js", import.meta.url);
    for (let i = 0; i < POOL_SIZE; i++) {
        const worker = new Worker(workerUrl);
        worker.isBusy = false;
        workers.push(worker);
    }
}

export function runWorkerTask(message) {
    if (workers.length === 0) initWorkerPool();
    
    return new Promise((resolve, reject) => {
        const availableWorker = workers.find(w => !w.isBusy);
        const task = { message, resolve, reject };
        
        if (availableWorker) {
            assignTask(availableWorker, task);
        } else {
            taskQueue.push(task);
        }
    });
}

function assignTask(worker, task) {
    worker.isBusy = true;
    
    worker.onmessage = (e) => {
        worker.isBusy = false;
        const { type, data, error } = e.data;
        
        if (type === 'SUCCESS') {
            task.resolve(data);
        } else if (type === 'ERROR') {
            task.reject(new Error(error));
        }
        
        checkQueue();
    };
    
    worker.onerror = (err) => {
        worker.isBusy = false;
        task.reject(new Error(`Worker Error: ${err.message}`));
        checkQueue();
    };
    
    worker.postMessage(task.message);
}

function checkQueue() {
    if (taskQueue.length > 0) {
        const availableWorker = workers.find(w => !w.isBusy);
        if (availableWorker) {
            assignTask(availableWorker, taskQueue.shift());
        }
    }
}
