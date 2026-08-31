import { useState, useEffect, useCallback } from 'react';
import { useRateLimitStore } from '../store/rateLimitStore';

/**
 * Hook to monitor rate limit status and provide countdown until reset
 */
export function useRateLimit() {
    const { isRateLimited, resetTime, retryAttempt, message } = useRateLimitStore();
    const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

    useEffect(() => {
        // Gaard: clear countdown when not rate limited
        if (!isRateLimited || !resetTime) {
            // Use a microtask to avoid synchronous setState inside the effect body
            const timer = setTimeout(() => setSecondsRemaining(null), 0);
            return () => clearTimeout(timer);
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
            setSecondsRemaining(remaining);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [isRateLimited, resetTime]);

    // Allows callers to wait until the rate limit resets before making RPC calls.
    const waitForReset = useCallback(async () => {
        if (!isRateLimited) return;
        const resetAt = resetTime ?? Date.now();
        const delay = Math.max(0, resetAt - Date.now());
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }, [isRateLimited, resetTime]);

    return {
        isRateLimited,
        secondsRemaining,
        retryAttempt,
        message,
        waitForReset,
    };
}
