package repository

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-redis/redis"
	"log"
	"main.go/data"
	"os"
	"time"
)

type UserCache struct {
	cli *redis.Client
	log *log.Logger
}

const (
	cacheRequestConstruct = "requests:%s"
	cacheUserConstruct    = "activeUser:%s"
	cacheRequests         = "requests"
	cacheUser             = "activeUser"
)

func constructKeyForRequest(id string) string {
	return fmt.Sprintf(cacheRequestConstruct, id)
}

func constructKeyForUser(id string) string {
	return fmt.Sprintf(cacheUserConstruct, id)
}

func NewCache(logger *log.Logger) (*UserCache, error) {
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	redisAddress := fmt.Sprintf("%s:%s", redisHost, redisPort)

	client := redis.NewClient(&redis.Options{
		Addr: redisAddress,
	})

	if err := client.Ping().Err(); err != nil {
		return nil, err
	}

	return &UserCache{
		cli: client,
		log: logger,
	}, nil
}

func (uc *UserCache) Login(user *data.Account, token string) error {
	key := user.ID
	one, err := uc.cli.Get(constructKeyForUser(key.Hex())).Bytes()
	if err != nil {
		return err
	}
	if one != nil {
		return errors.New("user is already logged in")
	}
	value, err := json.Marshal(token)
	if err != nil {
		return err
	}

	err = uc.cli.Set(constructKeyForUser(key.Hex()), value, 30*time.Minute).Err()

	return err
}

func (uc *UserCache) VerifyToken(userID string) (bool, error) {

	key := constructKeyForUser(userID)
	exists, err := uc.cli.Exists(key).Result()
	if err != nil {
		return false, err
	}

	if exists > 0 {
		return true, nil
	} else {
		return false, nil
	}
}
