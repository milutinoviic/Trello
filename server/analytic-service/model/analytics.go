package model

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type AnalyticsDocument struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty"` // ID of analytics doc
	ProjectID          string             `bson:"project_id"`
	TotalTasks         int                `bson:"total_tasks"`
	TasksByStatus      map[string]int     `bson:"tasks_by_status"`
	TasksTimeSpent     []TaskTimeSpent    `bson:"tasks_time_spent"`
	UsersOnProject     []UserOnProject    `bson:"users_on_project"` // Users and their tasks in the project
	ProjectOnSchedule  bool               `bson:"project_on_schedule"`
	CompletionEstimate time.Time          `bson:"completion_estimate"`
	LastUpdated        time.Time          `bson:"last_updated"` // Last time the analytics data was updated
}

type TaskTimeSpent struct {
	TaskID      string          `bson:"task_id"`
	TimeInState []StateDuration `bson:"time_in_state"`
}

type StateDuration struct {
	State    string `bson:"state"`
	Duration int    `bson:"duration"`
}

type UserOnProject struct {
	UserID        string           `bson:"user_id"`
	TasksAssigned []TaskAssignment `bson:"tasks_assigned"`
}

type TaskAssignment struct {
	TaskID string `bson:"task_id"`
	Status string `bson:"status"`
}
