/**
 * Platform-Agnostic API Manager
 * Standardizes API responses and error handling across all modules
 */

class APIResponse {
    constructor(success = true, data = null, message = '', error = null) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }

    static success(data, message = 'Operation completed successfully') {
        return new APIResponse(true, data, message, null);
    }

    static error(error, message = 'Operation failed') {
        const errorInfo = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error;
        
        return new APIResponse(false, null, message, errorInfo);
    }

    static partial(data, error, message = 'Operation completed with warnings') {
        const errorInfo = error instanceof Error ? {
            name: error.name,
            message: error.message
        } : error;
        
        return new APIResponse(true, data, message, errorInfo);
    }
}

class APIManager {
    constructor() {
        this.routes = new Map();
        this.middleware = [];
        this.errorHandlers = [];
    }

    /**
     * Register a route handler
     */
    registerRoute(path, method, handler, options = {}) {
        const key = `${method.toUpperCase()}:${path}`;
        this.routes.set(key, {
            handler,
            options,
            middleware: options.middleware || []
        });
    }

    /**
     * Add global middleware
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Add error handler
     */
    addErrorHandler(handler) {
        this.errorHandlers.push(handler);
    }

    /**
     * Handle API request with standardized response format
     */
    async handleRequest(path, method, data = null, context = {}) {
        const upperMethod = method.toUpperCase();
        
        // First try exact match
        const exactKey = `${upperMethod}:${path}`;
        let route = this.routes.get(exactKey);
        let params = {};

        // If no exact match, try pattern matching for parameterized routes
        if (!route) {
            for (const [routeKey, routeConfig] of this.routes) {
                const [routeMethod, routePath] = routeKey.split(':', 2);
                
                if (routeMethod === upperMethod) {
                    const match = this.matchRoute(routePath, path);
                    if (match) {
                        route = routeConfig;
                        params = match.params;
                        break;
                    }
                }
            }
        }

        if (!route) {
            return APIResponse.error(
                { code: 'ROUTE_NOT_FOUND', path, method },
                `Route not found: ${method} ${path}`
            );
        }

        // Add params to context
        context.params = params;

        try {
            // Run global middleware
            for (const middleware of this.middleware) {
                await middleware(context);
            }

            // Run route-specific middleware
            for (const middleware of route.middleware) {
                await middleware(context);
            }

            // Execute handler
            const result = await route.handler(data, context);

            // Ensure result is properly formatted
            if (result instanceof APIResponse) {
                return result;
            } else {
                return APIResponse.success(result);
            }

        } catch (error) {
            console.error(`[API ERROR] ${method} ${path}:`, error);

            // Run error handlers
            for (const errorHandler of this.errorHandlers) {
                try {
                    await errorHandler(error, { path, method, data, context });
                } catch (handlerError) {
                    console.error('[ERROR HANDLER FAILED]:', handlerError);
                }
            }

            return APIResponse.error(error, `Failed to process ${method} ${path}`);
        }
    }

    /**
     * Match route pattern with actual path and extract parameters
     */
    matchRoute(pattern, path) {
        // Convert Express-style route to regex
        // e.g., /config-profiles/:id -> /config-profiles/([^/]+)
        const paramNames = [];
        const regexPattern = pattern
            .replace(/:[^/]+/g, (match) => {
                paramNames.push(match.substring(1)); // Remove the ':'
                return '([^/]+)';
            })
            .replace(/\//g, '\\/'); // Escape forward slashes

        const regex = new RegExp(`^${regexPattern}$`);
        const match = path.match(regex);

        if (!match) {
            return null;
        }

        // Extract parameters
        const params = {};
        for (let i = 0; i < paramNames.length; i++) {
            params[paramNames[i]] = match[i + 1];
        }

        return { params };
    }

    /**
     * Standard validation middleware
     */
    static createValidationMiddleware(schema) {
        return async (context) => {
            const { data } = context;
            
            for (const [field, rules] of Object.entries(schema)) {
                if (rules.required && (data[field] === undefined || data[field] === null)) {
                    throw new Error(`Field '${field}' is required`);
                }
                
                if (data[field] !== undefined && rules.type) {
                    const actualType = typeof data[field];
                    if (actualType !== rules.type) {
                        throw new Error(`Field '${field}' must be of type ${rules.type}, got ${actualType}`);
                    }
                }
                
                if (data[field] !== undefined && rules.validate) {
                    const isValid = await rules.validate(data[field]);
                    if (!isValid) {
                        throw new Error(`Field '${field}' failed validation`);
                    }
                }
            }
        };
    }

    /**
     * Rate limiting middleware
     */
    static createRateLimitMiddleware(maxRequests = 100, windowMs = 60000) {
        const requests = new Map();
        
        return async (context) => {
            const key = context.ip || 'unknown';
            const now = Date.now();
            
            if (!requests.has(key)) {
                requests.set(key, []);
            }
            
            const userRequests = requests.get(key);
            
            // Remove old requests outside the window
            const validRequests = userRequests.filter(time => now - time < windowMs);
            
            if (validRequests.length >= maxRequests) {
                throw new Error('Rate limit exceeded');
            }
            
            validRequests.push(now);
            requests.set(key, validRequests);
        };
    }

    /**
     * Authentication middleware
     */
    static createAuthMiddleware(validateToken) {
        return async (context) => {
            const token = context.headers?.authorization?.replace('Bearer ', '');
            
            if (!token) {
                throw new Error('Authentication token required');
            }
            
            const isValid = await validateToken(token);
            if (!isValid) {
                throw new Error('Invalid authentication token');
            }
            
            context.authenticated = true;
        };
    }

    /**
     * Logging middleware
     */
    static createLoggingMiddleware(logger = console) {
        return async (context) => {
            const { method, path, data } = context;
            logger.log(`[API] ${method} ${path}`, { 
                timestamp: new Date().toISOString(),
                data: data ? Object.keys(data) : null
            });
        };
    }

    /**
     * Standard error response formats
     */
    static standardErrorFormats = {
        VALIDATION_ERROR: (field, message) => ({
            code: 'VALIDATION_ERROR',
            field,
            message
        }),
        
        NOT_FOUND: (resource) => ({
            code: 'NOT_FOUND',
            resource,
            message: `${resource} not found`
        }),
        
        PERMISSION_DENIED: (action) => ({
            code: 'PERMISSION_DENIED',
            action,
            message: `Permission denied for action: ${action}`
        }),
        
        SYSTEM_ERROR: (operation) => ({
            code: 'SYSTEM_ERROR',
            operation,
            message: `System error during ${operation}`
        }),
        
        RATE_LIMIT: (limit, window) => ({
            code: 'RATE_LIMIT_EXCEEDED',
            limit,
            window,
            message: `Rate limit exceeded: ${limit} requests per ${window}ms`
        })
    };

    /**
     * Get API documentation
     */
    getDocumentation() {
        const routes = Array.from(this.routes.entries()).map(([key, route]) => {
            const [method, path] = key.split(':');
            return {
                method,
                path,
                options: route.options,
                middleware: route.middleware.length
            };
        });

        return {
            version: '1.0.0',
            routes,
            middleware: this.middleware.length,
            errorHandlers: this.errorHandlers.length
        };
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        return APIResponse.success({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            routes: this.routes.size,
            middleware: this.middleware.length
        });
    }
}

// Standard data transformation utilities
class DataTransformer {
    static sanitizeSystemInfo(info) {
        return {
            platform: info.platform || 'unknown',
            version: info.version || 'unknown',
            hostname: info.hostname || 'unknown',
            uptime: typeof info.uptime === 'number' ? info.uptime : 0,
            timestamp: new Date().toISOString()
        };
    }

    static sanitizeMonitoringData(data) {
        return {
            system: {
                cpu: this.sanitizeMetric(data.system?.cpu),
                memory: this.sanitizeMetric(data.system?.memory),
                disk: this.sanitizeMetric(data.system?.disk),
                uptime: data.system?.uptime || 0
            },
            applications: Array.isArray(data.applications) ? data.applications : [],
            network: data.network || {},
            displays: data.displays || {},
            timestamp: data.timestamp || new Date().toISOString()
        };
    }

    static sanitizeMetric(metric) {
        if (!metric || typeof metric !== 'object') {
            return { usage: 0, status: 'unknown' };
        }
        
        // Preserve all enhanced monitoring data
        const sanitized = {
            usage: typeof metric.usage === 'number' ? metric.usage : 0,
            status: metric.status || 'unknown'
        };
        
        // Preserve basic fields
        if (metric.total !== undefined) sanitized.total = metric.total;
        if (metric.used !== undefined) sanitized.used = metric.used;
        if (metric.available !== undefined) sanitized.available = metric.available;
        if (metric.free !== undefined) sanitized.free = metric.free;
        
        // Preserve enhanced memory data
        if (metric.topProcesses) sanitized.topProcesses = metric.topProcesses;
        if (metric.inactive !== undefined) sanitized.inactive = metric.inactive;
        if (metric.wired !== undefined) sanitized.wired = metric.wired;
        if (metric.active !== undefined) sanitized.active = metric.active;
        
        // Preserve enhanced disk data
        if (metric.totalGB !== undefined) sanitized.totalGB = metric.totalGB;
        if (metric.usedGB !== undefined) sanitized.usedGB = metric.usedGB;
        if (metric.availableGB !== undefined) sanitized.availableGB = metric.availableGB;
        if (metric.volumes) sanitized.volumes = metric.volumes;
        if (metric.storageBreakdown) sanitized.storageBreakdown = metric.storageBreakdown;
        
        return sanitized;
    }

    static sanitizeApplicationList(apps) {
        if (!Array.isArray(apps)) return [];
        
        return apps.map(app => ({
            name: app.name || 'unknown',
            status: app.status || 'unknown',
            pid: app.pid || null,
            path: app.path || null,
            timestamp: app.timestamp || new Date().toISOString()
        }));
    }
}

module.exports = {
    APIManager,
    APIResponse,
    DataTransformer
};