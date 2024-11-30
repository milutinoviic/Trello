package hdfs

import (
	"github.com/colinmarc/hdfs/v2"
)

type HDFSClient struct {
	client *hdfs.Client
}

func NewHDFSClient(address string) (*HDFSClient, error) {
	client, err := hdfs.New(address)
	if err != nil {
		return nil, err
	}
	return &HDFSClient{client: client}, nil
}

func (h *HDFSClient) SaveFile(localPath string, hdfsPath string) error {
	return h.client.CopyToRemote(localPath, hdfsPath)
}
