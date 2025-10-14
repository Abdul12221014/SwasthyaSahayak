/**
 * Outbound Allowlist
 * 
 * Wraps fetch to enforce ALLOWLIST_OUTBOUND_HOSTS when feature flag is enabled.
 * Provides security by restricting outbound network calls to trusted domains.
 * 
 * @module backend/utils/outbound-allowlist
 */

interface AllowlistConfig {
  enabled: boolean;
  allowedHosts: string[];
}

class OutboundAllowlist {
  private config: AllowlistConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load allowlist configuration from environment
   */
  private loadConfig(): AllowlistConfig {
    const allowedHostsStr = Deno.env.get('ALLOWLIST_OUTBOUND_HOSTS') || '';
    const allowedHosts = allowedHostsStr
      .split(',')
      .map(host => host.trim())
      .filter(host => host.length > 0);

    return {
      enabled: allowedHosts.length > 0,
      allowedHosts
    };
  }

  /**
   * Check if a URL is allowed
   */
  private isUrlAllowed(url: string): boolean {
    if (!this.config.enabled) {
      return true; // Allowlist disabled
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Check if hostname matches any allowed host (including subdomains)
      return this.config.allowedHosts.some(allowedHost => {
        const allowedHostLower = allowedHost.toLowerCase();
        return hostname === allowedHostLower || hostname.endsWith('.' + allowedHostLower);
      });
    } catch (error) {
      // Invalid URL
      return false;
    }
  }

  /**
   * Secure fetch wrapper that enforces allowlist
   */
  async secureFetch(url: string, options?: RequestInit): Promise<Response> {
    if (!this.isUrlAllowed(url)) {
      throw new Error(`Outbound request to ${url} is not allowed by allowlist policy`);
    }

    return fetch(url, options);
  }

  /**
   * Get current allowlist configuration
   */
  getConfig(): AllowlistConfig {
    return { ...this.config };
  }

  /**
   * Check if allowlist is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get list of allowed hosts
   */
  getAllowedHosts(): string[] {
    return [...this.config.allowedHosts];
  }

  /**
   * Validate a URL without making a request
   */
  validateUrl(url: string): { allowed: boolean; reason?: string } {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      const isAllowed = this.config.allowedHosts.some(allowedHost => {
        const allowedHostLower = allowedHost.toLowerCase();
        return hostname === allowedHostLower || hostname.endsWith('.' + allowedHostLower);
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Hostname '${hostname}' is not in the allowlist. Allowed hosts: ${this.config.allowedHosts.join(', ')}`
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: `Invalid URL format: ${error.message}`
      };
    }
  }

  /**
   * Log allowlist violation (for monitoring)
   */
  private logViolation(url: string, reason: string) {
    console.warn(`[ALLOWLIST_VIOLATION] Blocked request to ${url}: ${reason}`);
  }

  /**
   * Create a fetch function that respects allowlist
   */
  createSecureFetch() {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      const validation = this.validateUrl(url);
      
      if (!validation.allowed) {
        this.logViolation(url, validation.reason || 'Unknown reason');
        throw new Error(`Outbound request blocked: ${validation.reason}`);
      }

      return fetch(url, options);
    };
  }
}

// Export singleton instance
export const outboundAllowlist = new OutboundAllowlist();

// Export secure fetch function
export const secureFetch = outboundAllowlist.secureFetch.bind(outboundAllowlist);

// Export types
export type { AllowlistConfig };
