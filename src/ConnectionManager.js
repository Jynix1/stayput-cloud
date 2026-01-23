const logger = require('./logger');
const Client = require('./Client');

class ConnectionManager {
  constructor() {
    /**
     * Time, in milliseconds, for connections to be considered timed out.
     */
    this.timeoutMilliseconds = 1000 * 30;
    /**
     * Number of distinct buckets for purposes of sending pings.
     */
    this.numberBuckets = 100;
    /** @private */
    this._pingInterval = null;
    /** @private */
    this.update = this.update.bind(this);
    /** @private */
    this.nextPingBucket = 0;
    /**
     * All connected clients.
     * @type {Array<Set<Client>>}
     * @private
     */
    this.clientBuckets = [];
    for (let i = 0; i < this.numberBuckets; i++) {
      this.clientBuckets.push(new Set());
    }
    /**
     * @type {Set<Client>}
     */
    this.allClients = new Set();
  }

  /**
   * @private
   */
  update() {
    const bucketNumber = this.nextPingBucket;
    this.nextPingBucket = (this.nextPingBucket + 1) % this.numberBuckets;

    if (bucketNumber === 0) {
      const totalClients = this.clientBuckets.reduce((a, i) => a + i.size, 0);
      if (totalClients > 0) {
        logger.info(`Total clients connected: ${totalClients}`);
      }
    }

    this.clientBuckets[bucketNumber].forEach((client) => {
      if (!client.ws) {
        client.timedOut('no ws');
        return;
      }

      if (!client.respondedToPing) {
        // Clients that have not responded to the last ping we sent are considered dead.
        client.timedOut('no pong');
        return;
      }

      if (client.room === null) {
        if (client.connectedAt < Date.now() - this.timeoutMilliseconds) {
          // Clients that have not joined a room in a reasonable time are considered dead.
          client.timedOut('no handshake');
          return;
        }
      }

      // Clients are sent a ping, and expected to respond to the ping by the time the next ping will be sent.
      client.ping();
    });
  }

  getNextClientBucket () {
    // Sequential assignment would be too easy for people to get a bunch of clients into one bucket, so we
    // assign it randomly. This is good enough for us, doesn't need to be cryptographically secure.
    return Math.floor(Math.random() * this.numberBuckets);
  }

  /**
   * Handle a connection from a client.
   * @param {Client} client The Client connecting.
   */
  handleConnect(client) {
    client.bucket = this.getNextClientBucket();
    this.clientBuckets[client.bucket].add(client);
    this.allClients.add(client);
  }

  /**
   * Handle a disconnection from a client.
   * @param {Client} client The Client disconnecting.
   */
  handleDisconnect(client) {
    this.clientBuckets[client.bucket].delete(client);
    this.allClients.delete(client);
  }

  /**
   * Handle a pong from a client.
   * @param {Client} client The WebSocket server the pong is from
   */
  handlePong(client) {
    client.respondedToPing = true;
  }

  /**
   * Start the ConnectionManager's periodic check.
   */
  start() {
    if (this._pingInterval) {
      throw new Error('Already started');
    }
    this._pingInterval = setInterval(this.update, this.timeoutMilliseconds / this.numberBuckets);
  }

  /**
   * Stop the ConnectionManager from running.
   */
  stop() {
    if (!this._pingInterval) {
      throw new Error('Not started');
    }
    clearInterval(this._pingInterval);
  }
}

module.exports = ConnectionManager;
