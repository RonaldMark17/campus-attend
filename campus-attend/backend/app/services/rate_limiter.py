import time
from collections import defaultdict
from typing import Tuple

class InMemoryLoginRateLimiter:
    """
    In-memory rate limiter to prevent brute-force attacks across the school LAN.
    Tracks failed login attempts by client identifier (e.g., client IP or IP + username).
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        # maps identifier -> list of failure timestamps
        self.failures: defaultdict[str, list[float]] = defaultdict(list)

    def _cleanup_old_attempts(self, key: str, now: float) -> list[float]:
        threshold = now - self.window_seconds
        active_attempts = [t for t in self.failures[key] if t > threshold]
        self.failures[key] = active_attempts
        return active_attempts

    def is_rate_limited(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        active = self._cleanup_old_attempts(key, now)
        if len(active) >= self.max_attempts:
            # calculate seconds until the oldest attempt leaves the window
            oldest = active[0]
            remaining = int((oldest + self.window_seconds) - now)
            return True, max(remaining, 1)
        return False, 0

    def record_failure(self, key: str) -> None:
        now = time.time()
        self.failures[key].append(now)

    def reset_failures(self, key: str) -> None:
        if key in self.failures:
            del self.failures[key]

# Global singleton rate limiter instance
login_rate_limiter = InMemoryLoginRateLimiter(max_attempts=5, window_seconds=300)
