package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port              string
	DBDriver          string
	MongoURI          string
	FirebaseProjectID string
	AuthDisabled      bool   // When true, injects a dev user and skips JWT verification
	DevUserID         string // User ID to inject when auth is disabled
	LogLevel          string
	RateLimitRPM      int
	CORSOrigins       string

	// AWS
	AWSRegion         string
	DynamoTablePrefix string

	// S3 storage backend
	S3Bucket string
	S3Prefix string

	// Firestore storage backend
	FirestoreToken string // OAuth2 access token (or empty for ADC)
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		DBDriver:          getEnv("DB_DRIVER", "mongo"),
		MongoURI:          getEnv("MONGO_URI", "mongodb://localhost:27017/vmt"),
		FirebaseProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
		AuthDisabled:      getEnv("AUTH_DISABLED", "") == "true",
		DevUserID:         getEnv("DEV_USER_ID", "dev-user-1"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		RateLimitRPM:      getEnvInt("RATE_LIMIT_RPM", 60),
		CORSOrigins:       getEnv("CORS_ORIGINS", "*"),
		AWSRegion:         getEnv("AWS_REGION", ""),
		DynamoTablePrefix: getEnv("DYNAMO_TABLE_PREFIX", "vmt_"),
		S3Bucket:          getEnv("S3_BUCKET", ""),
		S3Prefix:          getEnv("S3_PREFIX", "vmt/"),
		FirestoreToken:    getEnv("FIRESTORE_TOKEN", ""),
	}

	if cfg.FirebaseProjectID == "" && !cfg.AuthDisabled {
		return nil, fmt.Errorf("FIREBASE_PROJECT_ID is required (set AUTH_DISABLED=true for local dev)")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
