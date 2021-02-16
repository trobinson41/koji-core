import { v4 as uuidv4 } from 'uuid';
import Sockette from 'sockette';
import axios from 'axios';

const unsafeGlobal: any = global;
unsafeGlobal.WebSocket = require('isomorphic-ws');

/**
 * Defines a DispatchConfigurationInput interface.
 */
interface DispatchConfigurationInput {
  shardName?: string | null;
  maxConnectionsPerShard: number;
  authorization?: string;
}

/**
 * Defines a DispatchOptions interface.
 */
interface DispatchOptions {
  projectId?: string;
  shardName?: string | null;
  maxConnectionsPerShard?: number;
  authorization?: string;
  [index: string]: any;
}

/**
 * Defines constants for Koji platform events.
 */
export enum PlatformEvents {
  CONNECTED = '@@KOJI_DISPATCH/CONNECTED',
  CONNECTED_CLIENTS_CHANGED = '@@KOJI_DISPATCH/CONNECTED_CLIENTS_CHANGED',
  IDENTIFY = '@@KOJI_DISPATCH/IDENTIFY',
  SET_USER_INFO = '@@KOJI_DISPATCH/SET_USER_INFO',
}

/**
 * Defines a MessageHandler interface.
 */
export interface MessageHandler {
  id: string;
  eventName: string;
  callback: MessageHandlerCallback;
}

/**
 * Implements the callback function for the MessageHandler interface.
 */
export type MessageHandlerCallback = (payload: { [index: string]: any }, metadata: { latencyMs?: number }) => void;

/**
 * Defines a ShardInfo interface.
 */
export interface ShardInfo {
  shardName: string;
  numConnectedClients: number;
}

/**
 * Defines a ConnectionInfo interface.
 */
export interface ConnectionInfo {
  clientId?: string;
  shardName: string;
}

/**
 * Implements a dispatch system for the frontend of your Koji. For more information, see [[https://developer.withkoji.com/reference/packages/withkoji-dispatch-package | the Koji dispatch package reference]].
 */
export class Dispatch {
  private authToken?: string;
  private projectId?: string;

  private initialConnection: boolean = false;
  private isConnected: boolean = false;
  private eventHandlers: MessageHandler[] = [];
  private messageQueue: string[] = [];
  private ws: Sockette | null = null;

  /**
   * Gets shard info for the current project.
   * 
   * @return                   Shard info in the form of an array.
   * 
   * @example
   * ```javascript
   * const myInfo = await dispatch.info('myCollection');
   * ```
   */
  public async info(): Promise<ShardInfo[]> {
    const { data } = await axios.get(`https://dispatch-info.api.gokoji.com/info/${this.projectId}`);
    return (data || [])[0];
  }

  /**
   * Sets the project ID for the current project.
   * 
   * @param     projectId     Project ID.
   * 
   * @example
   * ```javascript
   * dispatch.setProjectId('myProject');
   * ```
   */
  public setProjectId(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Creates a shard connection.
   *
   * @param     shardName     Name of the shard.
   * @param     maxConnectionsPerShard   Maximum connections per Shard (defaults to 100).
   * @param     authorization Authorization credentials.
   *
   * @return                   ConnectionInfo object.
   * 
   * @example
   * ```javascript
   * const myInfo = await dispatch.connect('myShard', 100, authorization);
   * ```
   */
  public async connect({ shardName, maxConnectionsPerShard = 100, authorization }: DispatchConfigurationInput): Promise<ConnectionInfo> {
    return new Promise((resolve) => {
      if (this.ws) {
        return;
      }

      const options: DispatchOptions = {
        projectId: this.projectId,
        shardName,
        maxConnectionsPerShard,
      };

      const params: string[] = Object.keys(options).reduce((acc: string[], cur) => {
        if (options[cur]) {
          acc.push(`${cur}=${encodeURIComponent(options[cur])}`);
        }
        return acc;
      }, []);

      const url = `wss://dispatch.api.gokoji.com?${params.join('&')}`;

      this.authToken = authorization;

      // Create a socket connection to the dispatch server
      this.ws = new Sockette(url, {
        timeout: 5e3,
        maxAttempts: 10,
        onmessage: (e) => this.handleMessage(e, resolve),
        onreconnect: () => this.handleReconnect(),
        onmaximum: () => this.handleMaximum(),
        onclose: () => this.handleClose(),
        onerror: (e) => this.handleError(e),
      });
    });
  }

  /**
   * Handles a message event.
   *
   * @param     data        JSON object containing eventName, latencyMS, and payload.
   * @param     eventName   PlatformEvents enum value
   * @param     latencyMS   Latency in milliseconds
   * @param     payload     Client object
   * 
   * @example
   * ```javascript
   * dispatch.handleMessage(PlatformEvents.CONNECTED, 1000, client);
   * ```
   */ 
  private handleMessage({ data }: { data: string }, resolve: Function) {
    const { eventName, latencyMs, payload } = JSON.parse(data || '{}');

    if (eventName === PlatformEvents.CONNECTED) {
      this.initialConnection = true;
      this.isConnected = true;
      if (this.authToken) this.identify(this.authToken);
      resolve({
        clientId: payload.clientId,
        shardName: payload.shardName,
      });
      return;
    }

    this.eventHandlers.forEach((handler) => {
      if (eventName === handler.eventName) {
        handler.callback(payload, { latencyMs });
      }
    });
  }

  /**
   * Reconnects a shard.
   * 
   * @example
   * ```javascript
   * dispatch.handleReconnect();
   * ```
   */
  private handleReconnect() {
    this.isConnected = true;
    this.messageQueue = this.messageQueue.reduce((acc, cur) => {
      if (this.ws) {
        this.ws.send(cur);
      }
      return acc;
    }, []);
  }

  /**
   * Handles maximum.
   * 
   * @example
   * ```javascript
   * dispatch.handleMaximum();
   * ```
   */
  private handleMaximum() {}

  /**
   * Cleans up when connection is closed.
   * 
   * @example
   * ```javascript
   * dispatch.handleClose();
   * ```
   */
  private handleClose() {
    this.isConnected = false;
  }

  private handleError(e: Event) {
    console.error('[Koji Dispatch] error', e);
  }

  public on(eventName: string, callback: MessageHandlerCallback): Function {
    const handlerId = uuidv4();

    this.eventHandlers.push({
      id: handlerId,
      eventName,
      callback,
    });

    return () => {
      this.eventHandlers = this.eventHandlers.filter(({ id }) => id !== handlerId);
    };
  }

  public setUserInfo(userInfo: { [index: string]: any }) {
    this.emitEvent(PlatformEvents.SET_USER_INFO, userInfo);
  }

  public identify(authToken: string) {
    this.emitEvent(PlatformEvents.IDENTIFY, {
      token: authToken,
    });
  }

  public emitEvent(eventName: string, payload: { [index: string]: any }, recipients?: string[]) {
    const message = JSON.stringify({
      eventName,
      payload,
      recipients,
    });

    // Discard a long message
    if (message.length > 128e3) {
      throw new Error('Message is too long to be sent through Koji Dispatch. Messages must be less than 128kb');
    }

    // Check instantiation
    if (!this.initialConnection || !this.ws) {
      throw new Error('Please make sure you have called and awaited `connect()` before attempting to send a message');
    }

    // If the connection has dropped, push the message into a queue
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    this.ws.send(message);
  }

  public disconnect() {
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}

export const dispatch = new Dispatch();
