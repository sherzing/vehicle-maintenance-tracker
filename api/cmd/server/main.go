package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/auth"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/config"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/middleware"
	mongoRepo "github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository/mongo"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	slog.Info("config loaded", "port", cfg.Port, "db_driver", cfg.DBDriver)

	ctx := context.Background()

	// Initialize Firebase Auth verifier (key fetch is best-effort at startup)
	slog.Info("initializing firebase auth verifier", "project", cfg.FirebaseProjectID)
	verifier, err := auth.NewVerifier(ctx, cfg.FirebaseProjectID)
	if err != nil {
		slog.Error("failed to initialize firebase auth", "error", err)
		os.Exit(1)
	}
	slog.Info("firebase auth verifier ready")

	// Initialize repositories based on DB_DRIVER
	switch cfg.DBDriver {
	case "mongo":
		slog.Info("connecting to mongodb", "uri", cfg.MongoURI)
		repos, err := mongoRepo.NewRepositories(ctx, cfg.MongoURI)
		if err != nil {
			slog.Error("failed to connect to mongodb", "error", err)
			os.Exit(1)
		}
		slog.Info("mongodb connected")

		startServer(cfg, logger, handler.New(repos, verifier))

	default:
		slog.Error("unsupported DB_DRIVER", "driver", cfg.DBDriver)
		slog.Info("supported drivers: mongo")
		slog.Info("coming soon: firestore, dynamo")
		os.Exit(1)
	}
}

func startServer(cfg *config.Config, logger *slog.Logger, h *handler.Handler) {
	router := chi.NewRouter()

	// Global middleware
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.CORSOrigins},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	router.Use(middleware.Logging(logger))
	router.Use(middleware.RateLimit(cfg.RateLimitRPM))

	// Register routes
	h.RegisterRoutes(router)

	// Start server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
