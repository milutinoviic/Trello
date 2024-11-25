package client

import (
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
)

type ProjectDetails struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string             `bson:"name" json:"name"`
	EndDate    string             `bson:"end_date" json:"end_date"`
	MinMembers string             `bson:"min_members" json:"min_members"`
	MaxMembers string             `bson:"max_members" json:"max_members"`
	UserIDs    []string           `bson:"user_ids" json:"user_ids"`
	Users      []*UserDetails     `bson:"users" json:"users"` // List of UserDetails
	Manager    string             `bson:"manager" json:"manager"`
	Tasks      []*TaskDetails     `bson:"tasks" json:"tasks"` // List of Tasks
}

type ProjectsDetails []*ProjectDetails

func (p *ProjectsDetails) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}

func (p *ProjectDetails) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}
func (p *ProjectDetails) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(p)
}
