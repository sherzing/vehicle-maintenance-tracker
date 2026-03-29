package middleware

import (
	"net/http"
	"sync"
	"time"
)

type visitor struct {
	count    int
	windowStart time.Time
}

// RateLimit returns middleware that limits requests per user per minute.
func RateLimit(rpm int) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := make(map[string]*visitor)

	// Cleanup stale entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			for k, v := range visitors {
				if time.Since(v.windowStart) > time.Minute {
					delete(visitors, k)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			key := r.RemoteAddr
			if claims != nil {
				key = claims.UID
			}

			mu.Lock()
			v, exists := visitors[key]
			now := time.Now()

			if !exists || now.Sub(v.windowStart) > time.Minute {
				visitors[key] = &visitor{count: 1, windowStart: now}
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}

			v.count++
			if v.count > rpm {
				mu.Unlock()
				http.Error(w, `{"code":429,"message":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}
