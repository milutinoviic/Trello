package repository

import (
	"fmt"
	"github.com/gocql/gocql"
	"log"
	"notification-service/model"
	"os"
	"strconv"
	"time"
)

type NotificationRepo struct {
	session *gocql.Session
	logger  *log.Logger
}

func New(logger *log.Logger) (*NotificationRepo, error) {
	dbHost := os.Getenv("CASSANDRA_HOST")
	if dbHost == "" {
		logger.Println("Cassandra host is not set")
		return nil, fmt.Errorf("Cassandra host is not set")
	}

	dbPort := os.Getenv("CASSANDRA_PORT")
	if dbPort == "" {
		dbPort = "9042"
	}

	port, err := strconv.Atoi(dbPort)
	if err != nil {
		logger.Println("Invalid Cassandra port:", dbPort)
		return nil, fmt.Errorf("Invalid Cassandra port: %s", dbPort)
	}

	cluster := gocql.NewCluster(dbHost)
	cluster.Port = port
	cluster.Keyspace = "system"
	session, err := cluster.CreateSession()
	if err != nil {
		logger.Println("Error connecting to Cassandra:", err)
		return nil, err
	}

	err = session.Query(fmt.Sprintf(`CREATE KEYSPACE IF NOT EXISTS notifications
				WITH replication = {'class' : 'SimpleStrategy', 'replication_factor' : 1}`)).Exec()
	if err != nil {
		logger.Println("Error creating keyspace:", err)
		return nil, err
	}
	session.Close()

	cluster.Keyspace = "notifications"
	cluster.Consistency = gocql.One
	session, err = cluster.CreateSession()
	if err != nil {
		logger.Println("Error connecting to notifications keyspace:", err)
		return nil, err
	}

	return &NotificationRepo{
		session: session,
		logger:  logger,
	}, nil
}

func (repo *NotificationRepo) CloseSession() {
	repo.session.Close()
}

func (repo *NotificationRepo) CreateTables() {
	err := repo.session.Query(`CREATE TABLE IF NOT EXISTS notifications (
		id UUID PRIMARY KEY,
		user_id TEXT,
		message TEXT,
		created_at TIMESTAMP,
		status TEXT
	)`).Exec()
	if err != nil {
		repo.logger.Println("Error creating notifications table:", err)
	}

	err = repo.session.Query(`CREATE INDEX IF NOT EXISTS user_id_idx ON notifications (user_id)`).Exec()
	if err != nil {
		repo.logger.Println("Error creating index on user_id:", err)
	}
}

func (repo *NotificationRepo) Create(notification *model.Notification) error {
	location, err := time.LoadLocation("Europe/Budapest")
	if err != nil {
		log.Println("Error loading time zone:", err)
		return err
	}
	notification.CreatedAt = time.Now().In(location)

	notification.ID, _ = gocql.RandomUUID()

	err = repo.session.Query(`
		INSERT INTO notifications (id, user_id, message, created_at, status)
		VALUES (?, ?, ?, ?, ?)`,
		notification.ID, notification.UserID, notification.Message, notification.CreatedAt, notification.Status).Exec()

	if err != nil {
		repo.logger.Println("Error inserting notification:", err)
		return err
	}
	return nil
}

func (repo *NotificationRepo) GetByID(id gocql.UUID) (*model.Notification, error) {
	var notification model.Notification
	err := repo.session.Query(`
		SELECT id, user_id, message, created_at, status
		FROM notifications WHERE id = ?`, id).Consistency(gocql.One).Scan(
		&notification.ID, &notification.UserID, &notification.Message, &notification.CreatedAt, &notification.Status)

	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, fmt.Errorf("notification with ID %v not found", id)
		}
		repo.logger.Println("Error fetching notification:", err)
		return nil, err
	}
	location, err := time.LoadLocation("Europe/Budapest")
	if err != nil {
		log.Println("Error loading time zone:", err)
		return nil, err
	}

	notification.CreatedAt = notification.CreatedAt.In(location)

	return &notification, nil
}

func (repo *NotificationRepo) GetByUserID(userID string) ([]*model.Notification, error) {
	var notifications []*model.Notification
	iter := repo.session.Query(`
		SELECT id, user_id, message, created_at, status
		FROM notifications WHERE user_id = ?`, userID).Iter()

	for {
		var notification model.Notification
		if !iter.Scan(&notification.ID, &notification.UserID, &notification.Message, &notification.CreatedAt, &notification.Status) {
			break
		}
		notifications = append(notifications, &notification)
	}
	if err := iter.Close(); err != nil {
		repo.logger.Println("Error closing iterator:", err)
		return nil, err
	}
	return notifications, nil
}

func (repo *NotificationRepo) UpdateStatus(id gocql.UUID, status model.NotificationStatus) error {
	err := repo.session.Query(`
		UPDATE notifications SET status = ? WHERE id = ?`,
		status, id).Exec()
	if err != nil {
		repo.logger.Println("Error updating notification status:", err)
		return err
	}
	return nil
}

func (repo *NotificationRepo) Delete(id gocql.UUID) error {
	err := repo.session.Query(`
		DELETE FROM notifications WHERE id = ?`, id).Exec()
	if err != nil {
		repo.logger.Println("Error deleting notification:", err)
		return err
	}
	return nil
}
