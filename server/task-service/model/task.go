package model

import (
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
	"time"
)

type TaskStatus string

const (
	Pending    TaskStatus = "Pending"
	InProgress TaskStatus = "InProgress"
	Completed  TaskStatus = "Completed"
)

type Task struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID    string             `bson:"project_id" json:"projectId"`
	Name         string             `bson:"name" json:"name"`
	Description  string             `bson:"description" json:"description"`
	Status       TaskStatus         `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updatedAt"`
	UserIDs      []string           `bson:"user_ids" json:"user_ids"`
	Dependencies []string           `bson:"dependencies" json:"dependencies"`
	Blocked      bool               `bson:"blocked" json:"blocked"`
}

func (t *Task) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(t)
}

func (t *Task) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(t)
}
