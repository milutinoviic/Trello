package repository

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-redis/redis"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/data"
	"os"
	"time"
)

type UserCache struct {
	cli            *redis.Client
	log            *log.Logger
	userRepository *UserRepository
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

func NewCache(logger *log.Logger, repo *UserRepository) (*UserCache, error) {
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
		cli:            client,
		log:            logger,
		userRepository: repo,
	}, nil
}

func (uc *UserCache) Login(user *data.LoginCredentials, token string) error {
	keyForId, err := uc.userRepository.GetUserIdByEmail(user.Email)
	if err != nil {
		return errors.New("key is not found")
	}

	userFound, err := uc.userRepository.GetUserByEmail(user.Email)
	if err != nil {
		return err
	}

	err = bcrypt.CompareHashAndPassword([]byte(userFound.Password), []byte(user.Password))
	if err != nil {
		return errors.New("email and password don't match")
	}

	value, err := json.Marshal(token)
	if err != nil {
		return err
	}

	// For testing purposes TTL is set to 5 minutes.
	
	// In more realistic situations, it should be set to 30 minutes minimally.
	err = uc.cli.Set(constructKeyForUser(keyForId.Hex()), value, 5*time.Minute).Err()

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
