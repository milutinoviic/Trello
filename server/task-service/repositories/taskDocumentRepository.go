package repositories

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"task--service/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type TaskDocumentRepository struct {
	cli    *mongo.Client
	logger *log.Logger
	tracer trace.Tracer
}

func NewTaskDocumentRepository(ctx context.Context, logger *log.Logger, tracer trace.Tracer) (*TaskDocumentRepository, error) {
	dburi := os.Getenv("MONGO_DB_URI")
	if dburi == "" {
		return nil, fmt.Errorf("MONGO_DB_URI environment variable is not set")
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	if err = client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	logger.Println("Successfully connected to MongoDB")

	return &TaskDocumentRepository{
		cli:    client,
		logger: logger,
		tracer: tracer,
	}, nil
}

func (tdr *TaskDocumentRepository) Disconnect(ctx context.Context) error {
	ctx, span := tdr.tracer.Start(ctx, "TaskDocumentRepository.Disconnect")
	defer span.End()

	err := tdr.cli.Disconnect(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successfully disconnected")
	return nil
}

func (tdr *TaskDocumentRepository) getCollection() *mongo.Collection {
	projectDatabase := tdr.cli.Database("mongoTask")
	taskDocumentsCollection := projectDatabase.Collection("task_documents")
	return taskDocumentsCollection
}

func (tdr *TaskDocumentRepository) SaveTaskDocument(doc *model.TaskDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := tdr.tracer.Start(ctx, "TaskDocumentRepository.SaveTaskDocument")
	defer span.End()

	doc.UploadedAt = primitive.NewDateTimeFromTime(time.Now())
	collection := tdr.getCollection()

	_, err := collection.InsertOne(ctx, doc)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		tdr.logger.Printf("Failed to save task document: %v", err)
		return err
	}
	span.SetStatus(codes.Ok, "Successfully saved task document")
	return nil
}

func (tdr *TaskDocumentRepository) GetTaskDocumentsByTaskID(taskID string) ([]model.TaskDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := tdr.tracer.Start(ctx, "TaskDocumentRepository.GetTaskDocumentsByTaskID")
	defer span.End()

	collection := tdr.getCollection()
	filter := bson.M{"task_id": taskID}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		tdr.logger.Printf("Failed to find task documents: %v", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var documents []model.TaskDocument
	if err = cursor.All(ctx, &documents); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		tdr.logger.Printf("Failed to decode task documents: %v", err)
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successfully fetched task documents")
	return documents, nil
}

func (tdr *TaskDocumentRepository) DeleteTaskDocument(docID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := tdr.tracer.Start(ctx, "TaskDocumentRepository.DeleteTaskDocument")
	defer span.End()

	collection := tdr.getCollection()
	filter := bson.M{"_id": docID}

	_, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		tdr.logger.Printf("Failed to delete task document: %v", err)
		return err
	}
	span.SetStatus(codes.Ok, "Successfully deleted task document")
	return nil
}
