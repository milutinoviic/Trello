package domain

import (
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
)

type Project struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string             `bson:"name,omitempty" json:"name"`
	EndDate    string             `bson:"end_date,omitempty" json:"end_date"`
	MinMembers string             `bson:"min_members,omitempty" json:"min_members"`
	MaxMembers string             `bson:"max_members,omitempty" json:"max_members"`
}

func (p *Project) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}
func (p *Project) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(p)
}
