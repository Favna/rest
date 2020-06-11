import fetch, { Response, RequestInit } from 'node-fetch';
import AbortController from 'abort-controller';
import { sleep } from '@klasa/utils';
import { AsyncQueue } from '@klasa/async-queue';

import { DiscordAPIError } from '../errors/DiscordAPIError';
import { HTTPError } from '../errors/HTTPError';
import { RESTManagerEvents } from '../types/InternalREST';

import type { RESTManager } from './RESTManager';
import type { RouteIdentifier } from './REST';

/**
 * The structure used to handle requests for a given bucket
 */
export class RequestHandler {

	/**
	 * The interface used to sequence async requests sequentially
	 */
	public id: string;

	/**
	 * The interface used to sequence async requests sequentially
	 */
	private asyncQueue = new AsyncQueue();

	/**
	 * The time this ratelimit bucket will reset
	 */
	private reset = -1;

	/**
	 * The remaining requests that can be made before we are ratelimited
	 */
	private remaining = 1;

	/**
	 * The total number of requests that can be made before we are ratelimited
	 */
	private limit = Infinity;

	/**
	 * @param manager The rest manager
	 * @param hash The hash that this RequestHandler handles
	 * @param token The bot token used to make requests
	 */
	public constructor(private readonly manager: RESTManager, private readonly hash: string, private readonly majorParameter: string) {
		this.id = `${hash}:${majorParameter}`;
	}

	/* istanbul ignore next: No reason to test the sweeper in CI */

	/**
	 * The activity state of this RequestHandler
	 */
	public get inactive(): boolean {
		return this.asyncQueue.remaining === 0 && !this.limited;
	}

	/**
	 * If the ratelimit bucket is currently limited
	 */
	private get limited(): boolean {
		return this.remaining <= 0 && Date.now() < this.reset;
	}

	/**
	 * The time until queued requests can continue
	 */
	private get timeToReset(): number {
		return this.reset - Date.now();
	}

	/**
	 * Queues a request to be sent
	 * @param route The generalized api route with literal ids for major parameters
	 * @param request All the information needed to make a request
	 */
	public async push(routeID: RouteIdentifier, url: string, options: RequestInit): Promise<unknown> {
		// Wait for any previous requests to be completed before this one is run
		await this.asyncQueue.wait();
		try {
			// Wait for any global ratelimits to pass before continuing to process requests
			await this.manager.globalTimeout;
			// Check if this request handler is currently ratelimited
			if (this.limited) {
				// Let library users know they have hit a ratelimit
				this.manager.rest.emit(RESTManagerEvents.Ratelimited, {
					timeToReset: this.timeToReset,
					limit: this.limit,
					method: options.method,
					hash: this.hash,
					route: routeID.route,
					majorParameter: this.majorParameter
				});
				// Wait the remaining time left before the ratelimit resets
				await sleep(this.timeToReset);
			}
			// Make the request, and return the results
			return await this.makeRequest(routeID, url, options);
		} finally {
			// Allow the next request to fire
			this.asyncQueue.shift();
		}
	}

	/**
	 * The method that actually makes the request to the api, and updates info about the bucket accordingly
	 * @param route The generalized api route with literal ids for major parameters
	 * @param url The fully resolved url to make the request to
	 * @param options The node-fetch options needed to make the request
	 * @param retries The number of retries this request has already attempted (recursion)
	 */
	private async makeRequest(routeID: RouteIdentifier, url: string, options: RequestInit, retries = 0): Promise<unknown> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.manager.options.timeout);
		let res: Response;

		try {
			res = await fetch(url, { ...options, signal: controller.signal });
		} catch (error) {
			// Retry the specified number of times for possible timed out requests
			if (error.name === 'AbortError' && retries !== this.manager.options.retries) return this.makeRequest(routeID, url, options, ++retries);
			throw error;
		} finally {
			clearTimeout(timeout);
		}

		let retryAfter = 0;

		/* istanbul ignore else: Nock is always going to include headers, this is to handle unexpected type issue */
		if (res.headers) {
			const limit = res.headers.get('X-RateLimit-Limit');
			const remaining = res.headers.get('X-RateLimit-Remaining');
			const reset = res.headers.get('X-RateLimit-Reset-After');
			const hash = res.headers.get('X-RateLimit-Bucket');
			const retry = res.headers.get('Retry-After');

			// https://github.com/discord/discord-api-docs/issues/1463
			const cloudflare = !res.headers.get('Via');

			// Update the total number of requests that can be made before the ratelimit resets
			this.limit = limit ? Number(limit) : Infinity;
			// Update the number of remaining requests that can be made before the ratelimit resets
			this.remaining = remaining ? Number(remaining) : 1;
			// Update the time when this ratelimit resets (reset-after is in seconds)
			this.reset = reset ? (Number(reset) * 1000) + Date.now() + this.manager.options.offset : Date.now();

			// Amount of time in milliseconds until we should retry if ratelimited (globally or otherwise)
			// Cloudflare sends retry-after in seconds while discord sends it in milliseconds
			if (retry) retryAfter = (Number(retry) * (cloudflare ? 1000 : 1)) + this.manager.options.offset;

			// Handle buckets via the hash header retroactively
			if (hash && hash !== this.hash) {
				// Let library users know when ratelimit buckets have been updated
				this.manager.rest.emit(RESTManagerEvents.Debug, `Bucket hash update: ${this.hash} => ${hash} for ${options.method}-${routeID.route}`);
				// This queue will eventually be eliminated via attrition
				this.manager.hashes.set(`${options.method}-${routeID.route}`, hash);
			}

			// Handle global ratelimit
			if (res.headers.get('X-RateLimit-Global')) {
				// Set the manager's global timeout as the promise for other requests to "wait"
				this.manager.globalTimeout = sleep(retryAfter).then(() => {
					// After the timer is up, clear the promise
					this.manager.globalTimeout = null;
				});
			}
		}

		if (res.ok) {
			return RequestHandler.parseResponse(res);
		} else if (res.status === 429) {
			// A ratelimit was hit - this may happen if the route isn't associated with an official bucket hash yet, or when first globally ratelimited
			this.manager.rest.emit(RESTManagerEvents.Debug, `429 hit on route: ${routeID.route}\nRetrying after: ${retryAfter}ms`);
			// Wait the retryAfter amount of time before retrying the request
			await sleep(retryAfter);
			// Since this is not a server side issue, the next request should pass, so we don't bump the retries counter
			return this.makeRequest(routeID, url, options, retries);
		} else if (res.status >= 500 && res.status < 600) {
			// Retry the specified number of times for possible server side issues
			if (retries !== this.manager.options.retries) return this.makeRequest(routeID, url, options, ++retries);
			// We are out of retries, throw an error
			throw new HTTPError(res.statusText, res.constructor.name, res.status, options.method as string, url);
		} else {
			// Handle possible malformed requests
			if (res.status >= 400 && res.status < 500) {
				// The request will not succeed for some reason, parse the error returned from the api
				const data = await RequestHandler.parseResponse(res);
				// throw the api error
				throw new DiscordAPIError(data.message, data.code, res.status, options.method as string, url);
			}
			return null;
		}
	}

	/**
	 * Converts the response to usable data
	 * @param res The node-fetch response
	 */
	private static parseResponse(res: Response): any {
		if (res.headers.get('Content-Type')?.startsWith('application/json')) return res.json();
		return res.buffer();
	}

}
