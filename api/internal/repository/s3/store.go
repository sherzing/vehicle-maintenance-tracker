// Package s3 implements the repository interfaces using AWS S3 as a JSON file store.
//
// Each collection (teams, vehicles, etc.) is stored as a single JSON file in S3.
// Operations follow a read-modify-write pattern with an in-process mutex to
// serialize writes. For Lambda deployments, concurrent writes across invocations
// are unlikely given the low-traffic nature of this app, but the ETag on S3 objects
// can be used for additional safety if needed.
//
// This backend is designed for low-traffic apps (e.g. behind a mobile app with
// local caching) where simplicity and near-zero cost outweigh raw latency.
package s3

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository"
)

// S3API is the subset of the S3 client we need, enabling mock injection for tests.
type S3API interface {
	GetObject(ctx context.Context, params *s3.GetObjectInput, optFns ...func(*s3.Options)) (*s3.GetObjectOutput, error)
	PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error)
}

// Store provides S3-backed storage with per-collection JSON files.
type Store struct {
	client S3API
	bucket string
	prefix string // e.g. "vmt/" — all keys are prefixed
	mu     sync.Mutex
	idSeq  uint64
}

// NewStore creates a new S3-backed store.
func NewStore(client S3API, bucket, prefix string) *Store {
	return &Store{
		client: client,
		bucket: bucket,
		prefix: prefix,
	}
}

// NewRepositories creates all repository implementations backed by S3.
func NewRepositories(client S3API, bucket, prefix string) *repository.Repositories {
	store := NewStore(client, bucket, prefix)
	return &repository.Repositories{
		Teams:          &TeamRepo{store: store},
		Vehicles:       &VehicleRepo{store: store},
		Maintenance:    &MaintenanceRepo{store: store},
		ServiceHistory: &ServiceHistoryRepo{store: store},
		UsageHistory:   &UsageHistoryRepo{store: store},
	}
}

// nextID generates a unique ID combining timestamp with a sequence counter.
// Caller must hold s.mu.
func (s *Store) nextID(prefix string) string {
	s.idSeq++
	return fmt.Sprintf("%s_%d_%d", prefix, time.Now().UnixMicro(), s.idSeq)
}

// key returns the full S3 object key for a collection.
func (s *Store) key(collection string) string {
	return s.prefix + "collections/" + collection + ".json"
}

// load reads a collection from S3 and unmarshals it.
// Returns an empty slice (not error) if the key doesn't exist yet.
func load[T any](ctx context.Context, s *Store, collection string) ([]T, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String(s.key(collection)),
	})
	if err != nil {
		var nsk *types.NoSuchKey
		if asErr(err, &nsk) {
			return []T{}, nil
		}
		return nil, fmt.Errorf("s3 get %s: %w", collection, err)
	}
	defer out.Body.Close()

	data, err := io.ReadAll(out.Body)
	if err != nil {
		return nil, fmt.Errorf("s3 read %s: %w", collection, err)
	}

	var items []T
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, fmt.Errorf("s3 unmarshal %s: %w", collection, err)
	}
	return items, nil
}

// save marshals items and writes them to S3.
func save[T any](ctx context.Context, s *Store, collection string, items []T) error {
	data, err := json.Marshal(items)
	if err != nil {
		return fmt.Errorf("s3 marshal %s: %w", collection, err)
	}

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &s.bucket,
		Key:         aws.String(s.key(collection)),
		Body:        bytes.NewReader(data),
		ContentType: aws.String("application/json"),
	})
	if err != nil {
		return fmt.Errorf("s3 put %s: %w", collection, err)
	}
	return nil
}

// asErr walks an error chain looking for a target type (like errors.As but
// also handles AWS SDK error wrapping).
func asErr[T error](err error, target *T) bool {
	for err != nil {
		if e, ok := err.(T); ok {
			*target = e
			return true
		}
		if u, ok := err.(interface{ Unwrap() error }); ok {
			err = u.Unwrap()
		} else {
			return false
		}
	}
	return false
}

// notFound returns a standard not-found AppError.
func notFound(entity string) error {
	return model.ErrNotFound(entity)
}
