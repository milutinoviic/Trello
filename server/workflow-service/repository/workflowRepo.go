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
				//id, _ := record.Get("id")
				projectId, _ := record.Get("project_id")
				name, _ := record.Get("name")
				description, _ := record.Get("description")
				status, _ := record.Get("status")
				createdAt, _ := record.Get("created_at")
				updatedAt, _ := record.Get("updated_at")
				blocked, _ := record.Get("blocked")
				tasks = append(tasks, &model.TaskGraph{
					//ID:          id.(string),
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
				"CREATE (p:Task) SET p.id = $id, p.projectId = $projectId, p.name = $name, p.description = $description, p.status = $status, p.created_at = $created_at, p.updated_at = $updated_at, p.user_ids = $user_ids, p.dependencies = $dependencies, p.blocked = $blocked  RETURN p.name + ', from node ' + id(p)",
				map[string]any{"id": task.ID, "projectId": task.ProjectID, "name": task.Name, "description": task.Description, "status": task.Status, "created_at": task.CreatedAt, "updated_at": task.UpdatedAt, "user_ids": task.UserIds, "dependencies": task.Dependencies, "blocked": task.Blocked})
			if err != nil {
				return nil, err
			}

			wf.logger.Printf("Query parameters: %+v\n", map[string]any{
				"id":           task.ID,
				"project_id":   task.ProjectID,
				"name":         task.Name,
				"description":  task.Description,
				"status":       task.Status,
				"created_at":   task.CreatedAt,
				"updated_at":   task.UpdatedAt,
				"user_ids":     task.UserIds,
				"dependencies": task.Dependencies,
				"blocked":      task.Blocked,
			})
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
			RETURN t.id AS id, t.projectId AS projectId, t.name AS name, 
			       t.description AS description, t.status AS status, 
			       t.created_at AS created_at, 
			       t.updated_at AS updated_at, 
				   t.user_ids AS user_ids,
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
			userIds := []string{}
			if ids, ok := record.Get("user_ids"); ok && ids != nil {
				for _, id := range ids.([]any) {
					userIds = append(userIds, id.(string))
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
				UserIds:      userIds,
				Dependencies: dependencies,
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

func (wf *WorkflowRepo) AddDependency(taskID string, dependencyID string) error {
	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	// TODO: Make a proper check for cycles, now this version only generated new connections
	_, err := session.ExecuteWrite(ctx, func(transaction neo4j.ManagedTransaction) (any, error) {
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
		checkQuery2 := `
			MATCH (t:Task {id: $dependencyID}), (d:Task {id:  $taskID})
			OPTIONAL MATCH path = (d)-[:DEPENDS_ON*]->(t)
			OPTIONAL MATCH (t)-[r:DEPENDS_ON]->(d)
			RETURN r IS NOT NULL AS hasCycle
		`
		checkResult2, err := transaction.Run(ctx, checkQuery2, checkParams)
		if err != nil {
			return nil, err
		}

		if checkResult.Next(ctx) {
			hasCycle, _ := checkResult.Record().Get("hasCycle")
			if hasCycle.(bool) {
				return nil, errors.New("adding this dependency would create a cycle")
			}
		}
		if checkResult2.Next(ctx) {
			hasCycle, _ := checkResult2.Record().Get("hasCycle")
			if hasCycle.(bool) {
				return nil, errors.New("adding this dependency would create a cycle")
			}
		}
		checkCycleQuery := `
			MATCH (t:Task {id: $taskID}), (d:Task {id: $dependencyID})
			OPTIONAL MATCH path = (d)-[:DEPENDS_ON*]->(t)
			RETURN path IS NOT NULL AS hasCycle
		`
		checkCycleParams := map[string]any{"taskID": taskID, "dependencyID": dependencyID}
		checkCycleResult, err := transaction.Run(ctx, checkCycleQuery, checkCycleParams)
		if err != nil {
			return nil, err
		}
		if checkCycleResult.Next(ctx) {
			hasCycle, _ := checkCycleResult.Record().Get("hasCycle")
			if hasCycle.(bool) {
				return nil, errors.New("adding this dependency would create a cycle")
			}
		}

		updateQuery := `
			MATCH (t1:Task {id: $taskID}), (t2:Task {id: $dependencyID})
			CREATE (t1)-[:DEPENDS_ON {created_at: datetime()}]->(t2);
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
