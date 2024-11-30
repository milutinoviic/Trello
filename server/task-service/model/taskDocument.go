package model

import (
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
)

type TaskDocument struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TaskID     string             `bson:"task_id" json:"taskId"`
	FileName   string             `bson:"file_name" json:"fileName"`
	FileType   string             `bson:"file_type" json:"fileType"`
	FilePath   string             `bson:"file_path" json:"filePath"` // Putanja na HDFS-u
	UploadedAt primitive.DateTime `bson:"uploaded_at" json:"uploadedAt"`
}

func (td *TaskDocument) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(td)
}

func (td *TaskDocument) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(td)
}
