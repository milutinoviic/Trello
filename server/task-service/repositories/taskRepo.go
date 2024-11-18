package repositories

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"log"
	"os"
	"task--service/model"
	"time"
)

type TaskRepository struct {
	cli    *mongo.Client
	logger *log.Logger
}

func New(ctx context.Context, logger *log.Logger) (*TaskRepository, error) {
	dburi := os.Getenv("MONGO_DB_URI")

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		return nil, err
	}

	return &TaskRepository{
		cli:    client,
		logger: logger,
	}, nil
}

func (tr *TaskRepository) Disconnect(ctx context.Context) error {
	err := tr.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (tr *TaskRepository) getCollection() *mongo.Collection {
	projectDatabase := tr.cli.Database("mongoTask")
	projectCollection := projectDatabase.Collection("tasks")
	return projectCollection
}

func (tr *TaskRepository) Ping() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := tr.cli.Ping(ctx, readpref.Primary())
	if err != nil {
		tr.logger.Println(err)
	}

	databases, err := tr.cli.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		tr.logger.Println(err)
	}
	fmt.Println(databases)
}

func (tr *TaskRepository) Insert(task *model.Task) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tasksCollection := tr.getCollection()

	if task.UserIDs == nil {
		task.UserIDs = []string{}
	}

	if task.Status == "" {
		task.Status = model.Pending
	}

	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	result, err := tasksCollection.InsertOne(ctx, task)
	if err != nil {
		tr.logger.Println(err)
		return err
	}
	tr.logger.Printf("Task created with ID: %v\n", result.InsertedID)
	return nil
}

func (tr *TaskRepository) GetAllTask() (model.Tasks, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tasksCollection := tr.getCollection()

	var tasks model.Tasks
	tasksCursor, err := tasksCollection.Find(ctx, bson.M{})
	if err != nil {
		tr.logger.Println(err)
		return nil, err
	}
	if err = tasksCursor.All(ctx, &tasks); err != nil {
		tr.logger.Println(err)
		return nil, err
	}
	return tasks, nil
}

func (tr *TaskRepository) GetAllByProjectId(projectID string) ([]model.Task, error) {

	var tasks []model.Task

	filter := bson.M{"project_id": projectID}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tasksCollection := tr.getCollection()
	tasksCursor, err := tasksCollection.Find(ctx, filter)
	if err != nil {
		return tasks, err
	}
	defer tasksCursor.Close(ctx)

	// Decode documents into Task structs
	for tasksCursor.Next(ctx) {
		var task model.Task
		if err := tasksCursor.Decode(&task); err != nil {
			return tasks, err
		}
		tasks = append(tasks, task)
	}

	if err := tasksCursor.Err(); err != nil {
		return tasks, err
	}

	return tasks, nil

}

func (tr *TaskRepository) UpdateStatus(task *model.Task) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(task.ID.Hex())
	if err != nil {
		return fmt.Errorf("invalid task ID: %v", err)
	}

	tasksCollection := tr.getCollection()
	filter := bson.M{"_id": objID}
	update := bson.M{
		"$set": bson.M{
			"status":     task.Status,
			"updated_at": time.Now(),
		},
	}

	result, err := tasksCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update task status: %v", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("no task found with the given ID")
	}

	return nil
}
