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
	"project-service/model"
	"time"
)

type ProjectRepo struct {
	cli    *mongo.Client
	logger *log.Logger
}

func New(ctx context.Context, logger *log.Logger) (*ProjectRepo, error) {
	dburi := os.Getenv("MONGO_DB_URI")

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		return nil, err
	}

	return &ProjectRepo{
		cli:    client,
		logger: logger,
	}, nil
}

func (pr *ProjectRepo) Disconnect(ctx context.Context) error {
	err := pr.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (pr *ProjectRepo) Ping() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := pr.cli.Ping(ctx, readpref.Primary())
	if err != nil {
		pr.logger.Println(err)
	}

	databases, err := pr.cli.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		pr.logger.Println(err)
	}
	fmt.Println(databases)
}

func (pr *ProjectRepo) GetAll() (model.Projects, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	patientsCollection := pr.getCollection()

	var projects model.Projects
	patientsCursor, err := patientsCollection.Find(ctx, bson.M{})
	if err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	if err = patientsCursor.All(ctx, &projects); err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	return projects, nil
}

func (pr *ProjectRepo) GetAllByManager(managerEmail string) (model.Projects, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	projectsCollection := pr.getCollection()

	var projects model.Projects
	filter := bson.M{"manager": managerEmail}
	projectsCursor, err := projectsCollection.Find(ctx, filter)
	if err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	if err = projectsCursor.All(ctx, &projects); err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	return projects, nil
}

func (pr *ProjectRepo) GetAllByMember(userID string) (model.Projects, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	projectsCollection := pr.getCollection()

	var projects model.Projects
	filter := bson.M{"user_ids": userID}
	projectsCursor, err := projectsCollection.Find(ctx, filter)
	if err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	if err = projectsCursor.All(ctx, &projects); err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	return projects, nil
}

func (pr *ProjectRepo) GetById(id string) (*model.Project, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	patientsCollection := pr.getCollection()

	var patient model.Project
	objID, _ := primitive.ObjectIDFromHex(id)
	err := patientsCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&patient)
	if err != nil {
		pr.logger.Println(err)
		return nil, err
	}
	return &patient, nil
}

func (pr *ProjectRepo) Insert(project *model.Project) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	projectsCollection := pr.getCollection()

	if project.UserIDs == nil {
		project.UserIDs = []string{}
	}

	result, err := projectsCollection.InsertOne(ctx, &project)
	if err != nil {
		pr.logger.Println(err)
		return err
	}
	pr.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return nil
}

func (pr *ProjectRepo) getCollection() *mongo.Collection {
	projectDatabase := pr.cli.Database("mongoTrello")
	projectCollection := projectDatabase.Collection("projects")
	return projectCollection
}

func (pr *ProjectRepo) AddUsersToProject(projectId string, userIds []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := pr.getCollection()

	objID, err := primitive.ObjectIDFromHex(projectId)
	if err != nil {
		return fmt.Errorf("invalid project ID: %v", err)
	}

	var objIDs []primitive.ObjectID
	for _, userId := range userIds {
		objID, err := primitive.ObjectIDFromHex(userId)
		if err != nil {
			return fmt.Errorf("invalid user ID: %v", err)
		}
		objIDs = append(objIDs, objID)
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$addToSet": bson.M{"user_ids": bson.M{"$each": objIDs}}},
	)
	if err != nil {
		return fmt.Errorf("failed to add users to project: %v", err)
	}

	return nil
}

func (pr *ProjectRepo) RemoveUserFromProject(projectId string, userId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := pr.getCollection()

	// Convert projectId to ObjectID
	projectObjID, err := primitive.ObjectIDFromHex(projectId)
	if err != nil {
		return fmt.Errorf("invalid project ID: %v", err)
	}

	userObjID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return fmt.Errorf("invalid user ID: %v", err)
	}

	// Update the project to remove the user ID
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": projectObjID},
		bson.M{"$pull": bson.M{"user_ids": userObjID}},
	)
	if err != nil {
		return fmt.Errorf("failed to remove user from project: %v", err)
	}

	return nil
}
