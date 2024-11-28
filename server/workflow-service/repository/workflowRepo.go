package repository

import (
	"context"
	"errors"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel/trace"
	"log"
	"main.go/customLogger"
	"main.go/model"
	"os"
	"time"
)

type WorkflowRepo struct {
	driver     neo4j.DriverWithContext
	logger     *log.Logger
	custLogger *customLogger.Logger
	tracer     trace.Tracer
}

func New(logger *log.Logger, custLogger *customLogger.Logger, tracer trace.Tracer) (*WorkflowRepo, error) {
	uri := os.Getenv("NEO4J_DB")
	user := os.Getenv("NEO4J_USERNAME")
	pass := os.Getenv("NEO4J_PASS")
	auth := neo4j.BasicAuth(user, pass, "")

	driver, err := neo4j.NewDriverWithContext(uri, auth)
	if err != nil {
		logger.Panic(err)
		return nil, err
	}

	return &WorkflowRepo{
		driver:     driver,
		logger:     logger,
		custLogger: custLogger,
		tracer:     tracer,
	}, nil
}

func (wf *WorkflowRepo) CheckConnection() {
	ctx := context.Background()
	err := wf.driver.VerifyConnectivity(ctx)
	if err != nil {
		wf.logger.Panic(err)
		return
	}
	wf.logger.Printf(`Neo4J server address: %s`, wf.driver.Target().Host)
}

func (wf *WorkflowRepo) CloseDriverConnection(ctx context.Context) {
	wf.driver.Close(ctx)
}

func (wf *WorkflowRepo) GetAllNodesWithTask(limit int) (*model.TaskGraph, error) {
	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	movieResults, err := session.ExecuteRead(ctx,
		func(transaction neo4j.ManagedTransaction) (any, error) {
			result, err := transaction.Run(ctx,
				`MATCH (task:Task)
				RETURN task.id as id, task.project_id as project_id, task.name as name, task.description as description, task.status as status, task.created_at as created_at, task.updated_at = updated_at, task.dependencies as dependencies, task.blocked as blocked
				LIMIT $limit`,
				map[string]any{"limit": limit})
			if err != nil {
				return nil, err
			}

			var tasks model.TaskGraphs
			for result.Next(ctx) {
				record := result.Record()
				id, _ := record.Get("id")
				projectId, _ := record.Get("project_id")
				name, _ := record.Get("name")
				description, _ := record.Get("description")
				status, _ := record.Get("status")
				createdAt, _ := record.Get("created_at")
				updatedAt, _ := record.Get("updated_at")
				blocked, _ := record.Get("blocked")
				tasks = append(tasks, &model.TaskGraph{
					ID:          id.(string),
					ProjectID:   projectId.(string),
					Name:        name.(string),
					Description: description.(string),
					Status:      status.(model.TaskStatus),
					CreatedAt:   createdAt.(time.Time),
					UpdatedAt:   updatedAt.(time.Time),
					Blocked:     blocked.(bool),
				})
			}
			return tasks, nil

		})
	if err != nil {
		wf.logger.Println("Error querying search:", err)
		return nil, err
	}
	return movieResults.(*model.TaskGraph), nil
}

func (wf *WorkflowRepo) PostTask(task *model.TaskGraph) error {

	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	savedPerson, err := session.ExecuteWrite(ctx,
		func(transaction neo4j.ManagedTransaction) (any, error) {
			result, err := transaction.Run(ctx,
				"CREATE (p:Task) SET p.id = $id, p.project_id = $project_id, p.name = $name, p.description = $description, p.status = $status, p.created_at = $created_at, p.updated_at = $updated_at, p.dependencies = $dependencies, p.blocked = $blocked  RETURN p.name + ', from node ' + id(p)",
				map[string]any{"id": task.ID, "project_id": task.ProjectID, "name": task.Name, "description": task.Description, "status": task.Status, "created_at": task.CreatedAt, "updated_at": task.UpdatedAt, "dependencies": task.Dependencies, "blocked": task.Blocked})
			if err != nil {
				return nil, err
			}

			if result.Next(ctx) {
				return result.Record().Values[0], nil
			}

			return nil, result.Err()
		})
	if err != nil {
		wf.logger.Println("Error inserting Person:", err)
		return err
	}
	wf.logger.Println(savedPerson.(string))
	return nil
}

func (wf *WorkflowRepo) GetOne(taskID int) (*model.TaskGraph, error) {
	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	task, err := session.ExecuteRead(ctx, func(transaction neo4j.ManagedTransaction) (any, error) {
		query := `
			MATCH (t:Task {id: $id})
			OPTIONAL MATCH (t)-[:DEPENDS_ON]->(d:Task)
			RETURN t.id AS id, t.project_id AS project_id, t.name AS name, 
			       t.description AS description, t.status AS status, 
			       t.created_at AS created_at, 
			       t.updated_at AS updated_at, 
			       collect(d.id) AS dependencies, 
			       t.blocked AS blocked
		`
		params := map[string]any{"id": taskID}

		result, err := transaction.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}

		if result.Next(ctx) {
			record := result.Record()
			dependencies := []string{}
			if deps, ok := record.Get("dependencies"); ok {
				for _, dep := range deps.([]any) {
					dependencies = append(dependencies, dep.(string))
				}
			}

			return &model.TaskGraph{
				ID:           record.Values[0].(string),
				ProjectID:    record.Values[1].(string),
				Name:         record.Values[2].(string),
				Description:  record.Values[3].(string),
				Status:       model.TaskStatus(record.Values[4].(string)),
				CreatedAt:    record.Values[5].(time.Time),
				UpdatedAt:    record.Values[6].(time.Time),
				Dependencies: record.Values[7].([]string),
				Blocked:      record.Values[8].(bool),
			}, nil
		}
		return nil, errors.New("task not found")
	})

	if err != nil {
		wf.logger.Println("Error retrieving task:", err)
		return nil, err
	}

	return task.(*model.TaskGraph), nil
}

func (wf *WorkflowRepo) AddDependency(taskID int, dependencyID int) error {
	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(transaction neo4j.ManagedTransaction) (any, error) {
		//check if has cycle
		checkQuery := `
			MATCH (t:Task {id: $taskID}), (d:Task {id: $dependencyID})
			OPTIONAL MATCH path = (d)-[:DEPENDS_ON*]->(t)
			RETURN path IS NOT NULL AS hasCycle
		`
		checkParams := map[string]any{"taskID": taskID, "dependencyID": dependencyID}
		checkResult, err := transaction.Run(ctx, checkQuery, checkParams)
		if err != nil {
			return nil, err
		}

		if checkResult.Next(ctx) {
			hasCycle, _ := checkResult.Record().Get("hasCycle")
			if hasCycle.(bool) {
				return nil, errors.New("adding this dependency would create a cycle")
			}
		}
		updateQuery := `
			MATCH (t:Task {id: $taskID})
			SET t.dependencies = coalesce(t.dependencies, []) + $dependencyID
		`
		updateParams := map[string]any{"taskID": taskID, "dependencyID": dependencyID}
		_, err = transaction.Run(ctx, updateQuery, updateParams)
		return nil, err

	})

	if err != nil {
		wf.logger.Println("Error adding dependency:", err)
		return err
	}

	return nil
}
