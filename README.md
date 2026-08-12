# Mongo CRUD App

A Node.js + Express + MongoDB (Mongoose) REST API with full CRUD operations, built with a clean, scalable folder structure.

## Folder Structure

```
mongo-crud-app/
├── config/
│   ├── db.js                # MongoDB connection logic
│   └── roles.js             # Central role list + default role
├── controllers/
│   ├── auth.controller.js   # Auth route handlers
│   ├── studentController.js # Business logic for student routes
│   └── user.controller.js   # User route handlers
├── middleware/
│   ├── auth.js              # JWT access-token verification
│   ├── errorHandler.js      # Centralized error handling + 404
│   ├── rateLimiters.js      # Rate limiting for auth endpoints
│   ├── rbac.js              # Role-based access control
│   └── validate.js          # Declarative request-body validation
├── models/
│   ├── RefreshToken.js      # Refresh-token persistence (revocation/rotation)
│   ├── Student.js           # Mongoose schema/model
│   └── User.js              # User schema/model
├── routes/
│   ├── authRoutes.js        # Auth route definitions
│   ├── studentRoutes.js     # Student route definitions
│   └── userRoutes.js        # User route definitions
├── services/
│   ├── auth.service.js      # Auth business logic
│   └── token.service.js     # Access/refresh token issuing + verification
├── utils/
│   ├── ApiError.js          # Custom error class
│   ├── crypto.js            # Hashing helpers
│   ├── sendEmail.js         # Nodemailer wrapper
│   └── uniqueId.js          # Unique student ID generation
├── test/                    # node:test + supertest integration tests
├── .env                     # Environment variables (NOT committed to git)
├── .env.example             # Template for required env vars
├── .gitignore
├── package.json
├── server.js                # App entry point
└── README.md
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?appName=<cluster>
   ```
   > A database name (e.g. `madarsa_db`) is added to the URI path so Mongoose creates/uses a specific database. Change it to whatever name you prefer, or remove it to use MongoDB's default.

3. Run the app:
   ```bash
   npm run dev     # with nodemon (auto-restart on changes)
   # or
   npm start       # plain node
   ```

The server will start on `http://localhost:5000`.

## ⚠️ Important Security Note

Your connection string contains a **real username and password**. A few recommendations:
- Never commit `.env` to git (already excluded via `.gitignore`).
- If this string has ever been shared publicly (e.g., pasted in a chat, ticket, or repo), reset the database user's password in MongoDB Atlas → Database Access.
- In production, set `MONGODB_URI` as an environment variable on your host (Render, Railway, Heroku, etc.) instead of shipping a `.env` file.

## API Endpoints

### Auth (Email/Password)

All auth routes live under `/api/v1/auth` and return the standard response shape
`{ success, message, data?, errorCode? }`.

### Roles

| Role      | Notes                                    |
|-----------|------------------------------------------|
| `student` |                                          |
| `parent`  |                                          |
| `teacher` |                                          |
| `admin`   | Full access (e.g. `GET /api/v1/users`)   |
| `user`    | Default for email/password accounts      |
| `editor`  |                                          |

Roles are centrally defined in `config/roles.js`. New roles are added by
extending the `ROLES` object there.

### Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/signup` | Public | Register with `name`, `email`, `password` |
| POST | `/api/v1/auth/login` | Public | Login with `email`, `password` |
| POST | `/api/v1/auth/forgot-password` | Public | Send a reset link to `email` |
| POST | `/api/v1/auth/reset-password/:token` | Public | Set new password using the emailed token |
| POST | `/api/v1/auth/refresh-token` | Public | Rotate the refresh token, get a new access token |
| POST | `/api/v1/auth/logout` | Public | Revoke the refresh token |
| GET | `/api/v1/users/me` | Any authenticated | Current user profile |
| GET | `/api/v1/users` | `admin` only | List all users |

#### Signup — `POST /api/v1/auth/signup`

Request:
```json
{ "name": "John Doe", "email": "john@example.com", "password": "secret1234" }
```

Response `201`:
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "user", "status": "active", "isVerified": true },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

Notes:
- A client-supplied `role` is ignored; accounts always default to `user`.
- Errors: `400` validation, `409` duplicate email (`EMAIL_ALREADY_REGISTERED`).

#### Login — `POST /api/v1/auth/login`

Request:
```json
{ "email": "john@example.com", "password": "secret1234" }
```

Response `200`: same shape as signup. On bad credentials returns a generic
`401 { success: false, message: "Invalid email or password", errorCode: "INVALID_CREDENTIALS" }`
without revealing whether the email exists.

#### Forgot password — `POST /api/v1/auth/forgot-password`

Request:
```json
{ "email": "john@example.com" }
```

Response `200` (always the same, whether or not the email exists):
```json
{ "success": true, "message": "If an account exists for that email, a reset link has been sent" }
```

The reset link (`<RESET_PASSWORD_URL>/<token>`) is emailed via `utils/sendEmail.js`.
Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` to send
real mail; otherwise the message is logged to the console in development.
Rate limited per IP + email (`PASSWORD_RESET_LIMIT_PER_HOUR`, default 5/hr).

#### Reset password — `POST /api/v1/auth/reset-password/:token`

Request:
```json
{ "password": "newpassword456" }
```

Response `200`:
```json
{ "success": true, "message": "Password has been reset successfully" }
```

Errors: `400 INVALID_RESET_TOKEN` (bad token), `400 RESET_TOKEN_EXPIRED`
(token older than `PASSWORD_RESET_EXPIRES_IN` minutes, default 30).
On success the user's refresh tokens are revoked, logging out all sessions.

### Using the tokens

Attach the access token to protected requests:
```
Authorization: Bearer <accessToken>
```

Refresh the access token / rotate the refresh token:
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<refreshToken>" }'
```

### Example curl calls

```bash
# Signup
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret1234"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret1234"}'

# Forgot password
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Reset password (token comes from the emailed link)
curl -X POST http://localhost:5000/api/v1/auth/reset-password/<token> \
  -H "Content-Type: application/json" \
  -d '{"password":"newpassword456"}'

# Current profile (any authenticated user)
curl http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer <accessToken>"

# List users (admin only)
curl http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer <adminAccessToken>"
```

## Students CRUD

Base URL: `/api/student`

| Method | Endpoint          | Description            |
|--------|--------------------|------------------------|
| POST   | `/api/student`      | Create a new student    |
| GET    | `/api/student`      | Get all students        |
| GET    | `/api/student/:id`  | Get a single student    |
| PUT    | `/api/student/:id`  | Update a student        |
| DELETE | `/api/student/:id`  | Delete a student        |

opencode user command
1. to select opencode in vscode -> ctrl+shift+p -> type opencode -> enter
2. to see models -> type in terminal "opencode models or /models" -> enter
3. click tab to change plan to build
4. /new -> for new session
5. /varient -> to select the model capacity type (medium, high, low)

---- take prompt from skills.sh
