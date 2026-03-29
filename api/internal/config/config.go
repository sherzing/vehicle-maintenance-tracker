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
	LogLevel          string
	RateLimitRPM      int
	CORSOrigins       string

	// AWS (DynamoDB)
	AWSRegion        string
	DynamoTablePrefix string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		DBDriver:          getEnv("DB_DRIVER", "mongo"),
		MongoURI:          getEnv("MONGO_URI", "mongodb://localhost:27017/vmt"),
		FirebaseProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		RateLimitRPM:      getEnvInt("RATE_LIMIT_RPM", 60),
		CORSOrigins:       getEnv("CORS_ORIGINS", "*"),
		AWSRegion:         getEnv("AWS_REGION", ""),
		DynamoTablePrefix: getEnv("DYNAMO_TABLE_PREFIX", "vmt_"),
	}

	if cfg.FirebaseProjectID == "" {
		return nil, fmt.Errorf("FIREBASE_PROJECT_ID is required")
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
