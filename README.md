# Trello

## Description
The project is a platform for managing projects and tasks, similar to the popular app Trello. It allows creating, managing, and tracking projects and tasks in teams, with different roles such as project manager, team member, and guest user. The system uses a microservices architecture, where data about users, projects, and tasks is stored in NoSQL databases, while notifications, workflows, and analytics use specialized technologies for data processing. Users can create and manage projects, tasks, and workflows, as well as track the status of projects in real time.

## Technologies and Tools

- **Frontend**: Angular (used for the implementation)
- **Backend**: Microservices architecture based on Go 
- **Databases**:
  - NoSQL (MongoDB) for users and projects
  - Wide-column (Cassandra) for notifications
  - Graph database (Neo4j) for workflow management
- **Docker**: Containerization of services using Docker and Docker Compose
- **HDFS**: Storage for task-related documents
- **Redis**: Caching project activities
- **Jaeger**: Tracing for microservices
- **CQRS and Event Sourcing**: For managing changes in projects and analytics
- **Saga Pattern**: For managing the processes of deleting projects and tasks
- **API Gateway**: Unified communication point between the client and microservices
