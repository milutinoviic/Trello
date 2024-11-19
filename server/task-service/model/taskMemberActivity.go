package model

import (
	"time"
)

type TaskMemberActivity struct {
	ID        string    `bson:"_id,omitempty"`
	TaskID    string    `bson:"task_id"`
	UserID    string    `bson:"user_id"`
	Action    string    `bson:"action"` // "add" or "remove"
	Timestamp time.Time `bson:"timestamp"`
	Processed bool      `bson:"processed"`
}
