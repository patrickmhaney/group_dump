# Dumpster Sharing Webapp MVP

A web application that allows neighbors to coordinate and share dumpster rental costs by forming groups and booking rentals together.

## Features

- User registration and authentication
- Create and join neighbor groups
- Company directory for dumpster rental services
- Basic booking system for group rentals
- Dashboard with user statistics

## Tech Stack

**Backend:**
- Python/FastAPI
- SQLAlchemy ORM
- SQLite database (for MVP)
- JWT authentication
- Pydantic for data validation

**Frontend:**
- React with TypeScript
- React Router for navigation
- Axios for API calls
- Basic CSS styling

## Getting Started

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the FastAPI server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
- API documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will be available at http://localhost:3000

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /token` - Login (get access token)
- `GET /users/me` - Get current user info

### Groups
- `GET /groups` - List all groups
- `POST /groups` - Create new group
- `GET /groups/{id}` - Get group details
- `POST /groups/{id}/join` - Join a group
- `GET /groups/{id}/members` - Get group members

### Companies
- `GET /companies` - List all companies
- `POST /companies` - Register new company
- `GET /companies/{id}` - Get company details

### Rentals
- `GET /rentals` - Get user's rentals
- `POST /rentals` - Create new rental booking

## Database Schema

The application uses SQLite with the following main tables:
- `users` - User accounts and profiles
- `groups` - Neighbor groups for sharing rentals
- `group_members` - Many-to-many relationship between users and groups
- `companies` - Dumpster rental companies
- `rentals` - Rental bookings linked to groups and companies

## Environment Variables

Create a `.env` file in the root directory:
```
DATABASE_URL=sqlite:///./dumpster_sharing.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Development Notes

This is an MVP implementation with basic functionality. For production deployment, consider:

- Using PostgreSQL instead of SQLite
- Adding input validation and error handling
- Implementing proper logging
- Adding tests
- Setting up proper environment configuration
- Adding email/SMS notifications
- Implementing payment processing
- Adding maps integration
- Improving UI/UX design

## License

This project is for demonstration purposes.