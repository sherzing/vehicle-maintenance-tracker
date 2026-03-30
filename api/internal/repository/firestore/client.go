// Package firestore implements the repository interfaces using the Firestore
// REST API directly, without the heavy GCP SDK. This keeps the dependency
// footprint minimal — just net/http and encoding/json.
//
// Documents are stored in Firestore collections with proper field types.
// Each repository maps to a Firestore collection (teams, vehicles, etc.).
package firestore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	firestoreBaseURL = "https://firestore.googleapis.com/v1"
)

// HTTPClient is the interface for making HTTP requests, enabling mock injection.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Client wraps Firestore REST API operations.
type Client struct {
	httpClient HTTPClient
	projectID  string
	baseURL    string // full base URL to the database documents root
	token      string // OAuth2 bearer token (from service account or ADC)
}

// NewClient creates a Firestore REST client.
// The token should be a valid OAuth2 access token for the Firebase project.
func NewClient(httpClient HTTPClient, projectID, token string) *Client {
	return &Client{
		httpClient: httpClient,
		projectID:  projectID,
		baseURL:    fmt.Sprintf("%s/projects/%s/databases/(default)/documents", firestoreBaseURL, projectID),
		token:      token,
	}
}

// --- Firestore document types ---

// Document represents a Firestore document.
type Document struct {
	Name       string                `json:"name,omitempty"`
	Fields     map[string]FieldValue `json:"fields"`
	CreateTime string                `json:"createTime,omitempty"`
	UpdateTime string                `json:"updateTime,omitempty"`
}

// FieldValue represents a typed Firestore field value.
type FieldValue struct {
	StringValue    *string     `json:"stringValue,omitempty"`
	IntegerValue   *string     `json:"integerValue,omitempty"` // Firestore sends ints as strings
	DoubleValue    *float64    `json:"doubleValue,omitempty"`
	BooleanValue   *bool       `json:"booleanValue,omitempty"`
	TimestampValue *string     `json:"timestampValue,omitempty"`
	NullValue      *string     `json:"nullValue,omitempty"`
	ArrayValue     *ArrayValue `json:"arrayValue,omitempty"`
	MapValue       *MapValue   `json:"mapValue,omitempty"`
}

// ArrayValue holds an array of FieldValues.
type ArrayValue struct {
	Values []FieldValue `json:"values,omitempty"`
}

// MapValue holds a map of FieldValues.
type MapValue struct {
	Fields map[string]FieldValue `json:"fields,omitempty"`
}

// --- Field constructors ---

func stringField(v string) FieldValue {
	return FieldValue{StringValue: &v}
}

func intField(v int) FieldValue {
	s := fmt.Sprintf("%d", v)
	return FieldValue{IntegerValue: &s}
}

func doubleField(v float64) FieldValue {
	return FieldValue{DoubleValue: &v}
}

func boolField(v bool) FieldValue {
	return FieldValue{BooleanValue: &v}
}

func timeField(v time.Time) FieldValue {
	s := v.UTC().Format(time.RFC3339Nano)
	return FieldValue{TimestampValue: &s}
}

func nullField() FieldValue {
	n := "NULL_VALUE"
	return FieldValue{NullValue: &n}
}

func stringArrayField(vals []string) FieldValue {
	fv := make([]FieldValue, len(vals))
	for i, v := range vals {
		fv[i] = stringField(v)
	}
	return FieldValue{ArrayValue: &ArrayValue{Values: fv}}
}

func optionalDoubleField(v *float64) FieldValue {
	if v == nil {
		return nullField()
	}
	return doubleField(*v)
}

func optionalIntField(v *int) FieldValue {
	if v == nil {
		return nullField()
	}
	return intField(*v)
}

func optionalTimeField(v *time.Time) FieldValue {
	if v == nil {
		return nullField()
	}
	return timeField(*v)
}

func optionalStringField(v *string) FieldValue {
	if v == nil {
		return nullField()
	}
	return stringField(*v)
}

// --- Field extractors ---

func getString(fields map[string]FieldValue, key string) string {
	if fv, ok := fields[key]; ok && fv.StringValue != nil {
		return *fv.StringValue
	}
	return ""
}

func getFloat64(fields map[string]FieldValue, key string) float64 {
	if fv, ok := fields[key]; ok && fv.DoubleValue != nil {
		return *fv.DoubleValue
	}
	return 0
}

func getInt(fields map[string]FieldValue, key string) int {
	if fv, ok := fields[key]; ok && fv.IntegerValue != nil {
		var v int
		fmt.Sscanf(*fv.IntegerValue, "%d", &v)
		return v
	}
	return 0
}

func getTime(fields map[string]FieldValue, key string) time.Time {
	if fv, ok := fields[key]; ok && fv.TimestampValue != nil {
		t, _ := time.Parse(time.RFC3339Nano, *fv.TimestampValue)
		return t
	}
	return time.Time{}
}

func getOptionalFloat64(fields map[string]FieldValue, key string) *float64 {
	fv, ok := fields[key]
	if !ok || fv.NullValue != nil || fv.DoubleValue == nil {
		return nil
	}
	v := *fv.DoubleValue
	return &v
}

func getOptionalInt(fields map[string]FieldValue, key string) *int {
	fv, ok := fields[key]
	if !ok || fv.NullValue != nil || fv.IntegerValue == nil {
		return nil
	}
	var v int
	fmt.Sscanf(*fv.IntegerValue, "%d", &v)
	return &v
}

func getOptionalTime(fields map[string]FieldValue, key string) *time.Time {
	fv, ok := fields[key]
	if !ok || fv.NullValue != nil || fv.TimestampValue == nil {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, *fv.TimestampValue)
	if err != nil {
		return nil
	}
	return &t
}

func getOptionalString(fields map[string]FieldValue, key string) *string {
	fv, ok := fields[key]
	if !ok || fv.NullValue != nil || fv.StringValue == nil {
		return nil
	}
	v := *fv.StringValue
	return &v
}

func getStringArray(fields map[string]FieldValue, key string) []string {
	fv, ok := fields[key]
	if !ok || fv.ArrayValue == nil {
		return nil
	}
	result := make([]string, 0, len(fv.ArrayValue.Values))
	for _, v := range fv.ArrayValue.Values {
		if v.StringValue != nil {
			result = append(result, *v.StringValue)
		}
	}
	return result
}

// --- HTTP helpers ---

// createDoc creates a document in a collection. Returns the generated document ID.
func (c *Client) createDoc(ctx context.Context, collection string, fields map[string]FieldValue) (string, error) {
	doc := Document{Fields: fields}
	body, _ := json.Marshal(doc)

	url := fmt.Sprintf("%s/%s", c.baseURL, collection)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("firestore create %s: %w", collection, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", c.readError(resp, "create", collection)
	}

	var created Document
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		return "", err
	}
	return docID(created.Name), nil
}

// getDoc fetches a single document by collection and ID.
func (c *Client) getDoc(ctx context.Context, collection, id string) (*Document, error) {
	url := fmt.Sprintf("%s/%s/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("firestore get %s/%s: %w", collection, id, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, c.readError(resp, "get", collection)
	}

	var doc Document
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, err
	}
	return &doc, nil
}

// listDocs lists all documents in a collection.
func (c *Client) listDocs(ctx context.Context, collection string) ([]Document, error) {
	var allDocs []Document
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/%s?pageSize=300", c.baseURL, collection)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		c.setHeaders(req)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("firestore list %s: %w", collection, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, c.readError(resp, "list", collection)
		}

		var result struct {
			Documents     []Document `json:"documents"`
			NextPageToken string     `json:"nextPageToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, err
		}
		allDocs = append(allDocs, result.Documents...)

		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}

	return allDocs, nil
}

// updateDoc updates a document's fields.
func (c *Client) updateDoc(ctx context.Context, collection, id string, fields map[string]FieldValue) error {
	doc := Document{Fields: fields}
	body, _ := json.Marshal(doc)

	url := fmt.Sprintf("%s/%s/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("firestore update %s/%s: %w", collection, id, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.readError(resp, "update", collection)
	}
	return nil
}

// deleteDoc deletes a document.
func (c *Client) deleteDoc(ctx context.Context, collection, id string) error {
	url := fmt.Sprintf("%s/%s/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("firestore delete %s/%s: %w", collection, id, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.readError(resp, "delete", collection)
	}
	return nil
}

func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
}

func (c *Client) readError(resp *http.Response, op, collection string) error {
	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("firestore %s %s: status %d: %s", op, collection, resp.StatusCode, string(body))
}

// docID extracts the document ID from a Firestore document name.
// Name format: projects/{proj}/databases/(default)/documents/{collection}/{docId}
func docID(name string) string {
	parts := strings.Split(name, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return name
}
