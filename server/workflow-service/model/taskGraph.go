package model

import (
	"encoding/json"
	"io"
	"time"
)

type TaskStatus string

const (
	Pending    TaskStatus = "Pending"
	InProgress TaskStatus = "In Progress"
	Completed  TaskStatus = "Completed"
)

type TaskGraph struct {
	ID           string     `json:"id"`
	ProjectID    string     `json:"projectId"`
	Name         string     `json:"name"`
	Description  string     `json:"description"`
	Status       TaskStatus `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Dependencies []string   `json:"dependencies"`
	UserIds      []string   `json:"user_ids"`
	Blocked      bool       `bson:"blocked"`
}

type TaskGraphs []*TaskGraph

func (o *TaskGraphs) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(o)
}

func (a *TaskGraph) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(a)
}

func (a *TaskGraph) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(a)
}
