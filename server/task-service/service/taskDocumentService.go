package service

import (
	"fmt"
	"github.com/colinmarc/hdfs"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
	"os"
	"task--service/model"
	"task--service/repositories"
	"time"
)

func UploadToHDFS(client *hdfs.Client, repo *repositories.TaskRepository, localFilePath string, taskID string, fileName string) error {
	// Define HDFS destination path
	hdfsDestPath := fmt.Sprintf("/tasks/%s/%s", taskID, fileName)

	// Open the local file
	file, err := os.Open(localFilePath)
	if err != nil {
		return fmt.Errorf("error opening file: %v", err)
	}
	defer file.Close()

	// Create the file on HDFS
	hdfsFile, err := client.Create(hdfsDestPath)
	if err != nil {
		return fmt.Errorf("error creating file on HDFS: %v", err)
	}
	defer hdfsFile.Close()

	_, err = io.Copy(hdfsFile, file)
	if err != nil {
		return fmt.Errorf("error copying file to HDFS: %v", err)
	}

	// Save metadata to MongoDB
	doc := model.TaskDocument{
		ID:         primitive.NewObjectID(),
		TaskID:     taskID,
		FileName:   fileName,
		FilePath:   hdfsDestPath,
		UploadedAt: primitive.NewDateTimeFromTime(time.Now()),
	}

	err = repo.SaveTaskDocument(&doc)
	if err != nil {
		return fmt.Errorf("error saving document metadata to MongoDB: %v", err)
	}

	return nil
}
