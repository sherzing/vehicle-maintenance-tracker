package auth

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// Google's public key endpoint for Firebase Auth tokens
	googleCertsURL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
	// Cache keys for 1 hour
	keyCacheTTL = 1 * time.Hour
)

// Verifier validates Firebase JWT tokens without the full Firebase Admin SDK.
type Verifier struct {
	projectID string
	keys      map[string]*rsa.PublicKey
	keysMu    sync.RWMutex
	keysExp   time.Time
}

// Claims holds the decoded token claims.
type Claims struct {
	UID   string
	Email string
	Name  string
}

// NewVerifier creates a Firebase token verifier for the given project.
func NewVerifier(_ context.Context, projectID string) (*Verifier, error) {
	if projectID == "" {
		return nil, fmt.Errorf("projectID is required")
	}
	v := &Verifier{projectID: projectID}
	// Pre-fetch keys (best-effort; will retry on first request if this fails)
	_ = v.refreshKeys()
	return v, nil
}

// VerifyToken validates a Firebase ID token and returns the claims.
func (v *Verifier) VerifyToken(ctx context.Context, rawToken string) (*Claims, error) {
	tokenStr := strings.TrimPrefix(rawToken, "Bearer ")

	// Ensure keys are fresh
	if err := v.ensureKeys(); err != nil {
		return nil, fmt.Errorf("fetching public keys: %w", err)
	}

	// Parse and validate the token
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Look up the key by kid
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid header")
		}

		v.keysMu.RLock()
		key, exists := v.keys[kid]
		v.keysMu.RUnlock()

		if !exists {
			// Keys might have rotated; try refreshing once
			if err := v.refreshKeys(); err != nil {
				return nil, err
			}
			v.keysMu.RLock()
			key, exists = v.keys[kid]
			v.keysMu.RUnlock()
			if !exists {
				return nil, fmt.Errorf("unknown key id: %s", kid)
			}
		}

		return key, nil
	},
		jwt.WithIssuer(fmt.Sprintf("https://securetoken.google.com/%s", v.projectID)),
		jwt.WithAudience(v.projectID),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}

	claims := &Claims{}

	if sub, ok := mapClaims["sub"].(string); ok {
		claims.UID = sub
	}
	if claims.UID == "" {
		if uid, ok := mapClaims["user_id"].(string); ok {
			claims.UID = uid
		}
	}
	if claims.UID == "" {
		return nil, fmt.Errorf("token missing subject/uid")
	}

	if email, ok := mapClaims["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := mapClaims["name"].(string); ok {
		claims.Name = name
	}

	return claims, nil
}

// ensureKeys refreshes the key cache if expired.
func (v *Verifier) ensureKeys() error {
	v.keysMu.RLock()
	expired := time.Now().After(v.keysExp)
	empty := len(v.keys) == 0
	v.keysMu.RUnlock()

	if expired || empty {
		return v.refreshKeys()
	}
	return nil
}

// refreshKeys fetches Google's public keys for Firebase token verification.
func (v *Verifier) refreshKeys() error {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(googleCertsURL)
	if err != nil {
		return fmt.Errorf("fetching google certs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("google certs returned status %d", resp.StatusCode)
	}

	var certs map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&certs); err != nil {
		return fmt.Errorf("decoding google certs: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(certs))
	for kid, certPEM := range certs {
		block, _ := pem.Decode([]byte(certPEM))
		if block == nil {
			continue
		}
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			continue
		}
		rsaKey, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			continue
		}
		keys[kid] = rsaKey
	}

	v.keysMu.Lock()
	v.keys = keys
	v.keysExp = time.Now().Add(keyCacheTTL)
	v.keysMu.Unlock()

	return nil
}
