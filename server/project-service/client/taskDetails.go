package client

import (
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
	"time"
)

type TaskStatus string

const (
	Pending    TaskStatus = "Pending"
	InProgress TaskStatus = "In Progress"
	Completed  TaskStatus = "Completed"
)

type TaskDetails struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID    string             `bson:"project_id" json:"projectId"`
	Name         string             `bson:"name" json:"name"`
	Description  string             `bson:"description" json:"description"`
	Status       TaskStatus         `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updatedAt"`
	UserIDs      []string           `bson:"user_ids" json:"user_ids"`
	Users        []*UserDetails     `bson:"users" json:"users"` // List of UserDetails
	Dependencies []string           `bson:"dependencies" json:"dependencies"`
	Blocked      bool               `bson:"blocked" json:"blocked"`
}

type TasksDetails []*TaskDetails

func (p *TasksDetails) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}

func (t *TaskDetails) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(t)
}

func (t *TaskDetails) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(t)
}
