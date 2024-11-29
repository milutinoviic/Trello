package repository

import (
	"context"
	"errors"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"log"
	"os"
	"time"
	"workflow-service/customLogger"
	"workflow-service/model"
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

	savedPerson, err := session.ExecuteWrite(ctx,
		func(transaction neo4j.ManagedTransaction) (any, error) {
			result, err := transaction.Run(ctx,
				"CREATE (p:Task) SET p.id = $id, p.project_id = $project_id, p.name = $name, p.description = $description, p.status = $status, p.created_at = $created_at, p.updated_at = $updated_at, p.user_ids = $user_ids, p.dependencies = $dependencies, p.blocked = $blocked  RETURN p.name + ', from node ' + id(p)",
				map[string]any{"id": task.ID, "project_id": task.ProjectID, "name": task.Name, "description": task.Description, "status": task.Status, "created_at": task.CreatedAt, "updated_at": task.UpdatedAt, "user_ids": task.UserIds, "dependencies": task.Dependencies, "blocked": task.Blocked})
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

func (wf *WorkflowRepo) GetTaskGraph(projectID string) (map[string]any, error) {
	ctx := context.Background()
	_, span := wf.tracer.Start(ctx, "WorkflowRepository.GetTaskGraph")
	defer span.End()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `
            MATCH (task:Task {project_id: $projectID})
            OPTIONAL MATCH (task)-[:DEPENDS_ON]->(dep:Task)
            RETURN
                task.id AS id,
                task.name AS name,
                collect(dep.id) AS dependencies
        `
		params := map[string]any{"projectID": projectID}
		res, err := tx.Run(ctx, query, params)
		if err != nil {
			wf.logger.Println("Query execution failed:", err)
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			return nil, err
		}

		graph := map[string]any{"nodes": []map[string]any{}, "edges": []map[string]string{}}
		existingTasks := make(map[string]bool)

		for res.Next(ctx) {
			record := res.Record()
			taskID, ok := record.Values[0].(string)
			if !ok {
				wf.logger.Println("Invalid task ID:", record.Values[0])
				continue
			}
			taskName, ok := record.Values[1].(string)
			if !ok {
				wf.logger.Println("Invalid task name:", record.Values[1])
				continue
			}
			dependencies, ok := record.Values[2].([]any)
			if !ok {
				wf.logger.Println("Invalid dependencies:", record.Values[2])
				continue
			}

			if !existingTasks[taskID] {
				err := wf.createTaskIfNotExist(taskID, taskName, projectID)
				if err != nil {
					return nil, err
				}
				existingTasks[taskID] = true
			}

			nodes := graph["nodes"].([]map[string]any)
			nodes = append(nodes, map[string]any{
				"id":    taskID,
				"label": taskName,
			})
			graph["nodes"] = nodes

			for _, dep := range dependencies {
				depID, ok := dep.(string)
				if !ok {
					wf.logger.Println("Skipping invalid dependency:", dep)
					continue
				}
				if !existingTasks[depID] {
					err := wf.createTaskIfNotExist(depID, "Dependency Task", projectID)
					if err != nil {
						return nil, err
					}
					existingTasks[depID] = true
				}

				edges := graph["edges"].([]map[string]string)
				edges = append(edges, map[string]string{
					"from": taskID,
					"to":   depID,
				})
				graph["edges"] = edges
			}
		}

		if err := res.Err(); err != nil {
			wf.logger.Println("Error in query result:", err)
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			return nil, err
		}

		return graph, nil
	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		wf.logger.Println("Error querying task graph:", err)
		return nil, err
	}

	span.SetStatus(codes.Ok, "Successfully retrieved task graph")
	return result.(map[string]any), nil
}

func (wf *WorkflowRepo) createTaskIfNotExist(taskID, taskName, projectID string) error {
	ctx := context.Background()
	session := wf.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	query := `
        MERGE (task:Task {id: $taskID, project_id: $projectID})
        ON CREATE SET task.name = $taskName
        RETURN task
    `
	params := map[string]any{"taskID": taskID, "taskName": taskName, "projectID": projectID}
	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}
		if result.Next(ctx) {
			return nil, nil
		}
		return nil, result.Err()
	})

	return err
}
