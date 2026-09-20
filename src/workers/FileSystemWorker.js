
export default class FileSystemWorker {
  constructor() {
    this.worker = new Worker(
      new URL("./fileSystem.worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    this.requestId = 0;
    this.pendingRequests = new Map();

    this.worker.onmessage = (event) => {
      const { success, results, error, requestId } = event.data;

      const request = this.pendingRequests.get(requestId);

      if (!request) return;

      this.pendingRequests.delete(requestId);

      if (success) {
        request.resolve(results);
      } else {
        request.reject(new Error(error));
      }
    };

    this.worker.onerror = (error) => {
      console.error("Worker error:", error);
    };
  }

  execute(type, data) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
      });

      this.worker.postMessage({
        type,
        data,
        requestId,
      });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
