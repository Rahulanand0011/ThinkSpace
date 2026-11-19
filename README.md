# ThinkSpace

ThinkSpace is a full-stack application for student productivity and knowledge sharing. It brings task organization, community posts, and a student book marketplace into one web application, with profile and administration tools.

## Problem Statement

Students often manage study tasks, share notes or ideas, and find course books across separate tools. ThinkSpace provides a shared place for these activities, combining personal task management with community publishing and book listings.

## Project Objectives

- Give users one place to organize tasks and track their activity.
- Support writing and sharing posts with visibility controls and community interactions.
- Provide a searchable book marketplace for browsing and managing listings.
- Offer profile, notification, and administrative tools alongside those workflows.

## Key Features

- Account registration and login with password hashing and JWT-based API authentication.
- User profiles with editable name, biography, and avatar; public profiles show public posts and book listings.
- Create, edit, delete, and change visibility of posts; browse a paginated feed with search and sorting.
- Like posts, add and edit comments, and receive notifications for community interactions.
- Task management with deadlines, priorities, status updates, and drag-and-drop task organization.
- Textbook listings with image upload, search, category and condition filters, and price/date sorting.
- User dashboard with activity summaries, user search, role updates, and account removal.
- Newsletter form endpoint (currently validates an email and returns a confirmation; no mailing service integration is present).

## Technologies Used

### Frontend

- React 18 and Vite
- React Router and Axios
- Material UI, Emotion, React Icons, React DnD, Recharts, and AOS
- React Hook Form and Yup
- EasyMDE, Marked, and DOMPurify

### Backend

- Node.js with Express 4 and JavaScript ES modules
- MongoDB with Mongoose
- JWT and bcrypt authentication
- Multer file uploads, cookie-parser, express-validator, CORS, and dotenv

## Project Structure

```text
.
├── Backend/
│   ├── config/             # MongoDB connection
│   ├── controller/         # Request handlers and application logic
│   ├── middleware/         # User/admin authentication and image uploads
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express API route definitions
│   ├── .env.example        # Backend configuration template
│   ├── index.js            # Express server entry point
│   └── package.json
├── Frontend/
│   ├── components/         # Reusable UI components
│   ├── provider/           # Shared React context provider
│   ├── public/             # Static images and icons
│   ├── src/
│   │   ├── hooks/          # React hooks
│   │   ├── layouts/        # Navigation and route layouts
│   │   ├── pages/          # Application screens
│   │   ├── routes/         # Client-side route configuration
│   │   ├── index.css
│   │   └── main.jsx        # Frontend entry point
│   ├── .env.example        # Vite configuration template
│   ├── vite.config.js
│   └── package.json
├── preview.png             # Existing project preview image
└── README.md
```

The frontend calls the Express API using the `VITE_SERVER_ENDPOINT` base URL. The backend mounts application routes beneath `/api`, validates bearer JWTs for protected routes, connects to MongoDB through Mongoose, and serves uploaded files through `/api`, `/api/uploads`, and `/uploads` paths. Images are stored on the backend filesystem under the configured upload directory.

### Database

ThinkSpace uses MongoDB with Mongoose schemas for users, tasks, posts, products (book listings), and notifications. By default, the backend connects to `mongodb://127.0.0.1:27017/` and selects the `thinkspace` database. Both the connection URL and database name can be configured in the backend environment.

## Installation and Setup

### Prerequisites

- Node.js and npm.
- A MongoDB server, local or hosted.

### 1. Configure the backend

```bash
cd Backend
npm install
```

Copy `Backend/.env.example` to `Backend/.env`. Set `JWT_SECRET_KEY` to a private, strong value and configure MongoDB connection details if needed.

### 2. Configure the frontend

In a second terminal, from the repository root:

```bash
cd Frontend
npm install
```

Copy `Frontend/.env.example` to `Frontend/.env`. The default API endpoint is `http://localhost:3000/api`, matching the backend defaults and Vite's local development port.

### 3. Start MongoDB

Start the MongoDB service you configured. With the default backend settings, the application connects to `mongodb://127.0.0.1:27017/` and uses the `thinkspace` database.

## Environment Variables

The repository includes the following templates. Vite variables are embedded into the client at build time and must use the `VITE_` prefix. Do not commit actual `.env` files or secrets.

### `Backend/.env`

```dotenv
PORT=3000
DATABASE_URL=mongodb://127.0.0.1:27017/
DATABASE_NAME=thinkspace
BCRYPT_GEN_SALT_NUMBER=10
JWT_SECRET_KEY=replace_with_a_long_random_secret
COOKIE_EXPIRES=5d
COOKIE_KEY=thinkspace
UPLOAD_DIRECTORY=uploads
```

`PORT`, `DATABASE_URL`, `DATABASE_NAME`, and `UPLOAD_DIRECTORY` have defaults in the server. Set `JWT_SECRET_KEY` for token signing. `BCRYPT_GEN_SALT_NUMBER` controls bcrypt salt rounds. `COOKIE_EXPIRES` is used as the JWT expiry for regular account tokens; `COOKIE_KEY` is used by the admin login cookie flow.

### `Frontend/.env`

```dotenv
VITE_SERVER_ENDPOINT=http://localhost:3000/api
VITE_TOKEN_KEY=thinkspace
VITE_USER_ROLE=role
VITE_COOKIE_EXPIRES=1
VITE_COOKIE_KEY=thinkspace
VITE_USER_KEY=userId
```

The frontend reads `VITE_SERVER_ENDPOINT`, `VITE_TOKEN_KEY`, `VITE_USER_ROLE`, `VITE_COOKIE_EXPIRES`, and `VITE_USER_KEY`. `VITE_COOKIE_KEY` is present in the supplied template but is not referenced by current frontend source.

## How to Run the Project

Run the backend and frontend in separate terminals from their respective directories.

Backend development server (Node watch mode):

```bash
cd Backend
npm run dev
```

Or start the backend without watch mode:

```bash
cd Backend
npm start
```

Frontend development server:

```bash
cd Frontend
npm run dev
```

Vite prints the local address after startup (normally `http://localhost:5173`). To create and preview a production build:

```bash
cd Frontend
npm run build
npm run preview
```

The backend package does not currently define a functioning automated test command: `npm test` exits with “no test specified.” A `Backend/test-suite.js` file is present, but it requires a running local MongoDB and API server and is not wired to an npm script.

## API Documentation

Base URL: `http://localhost:3000/api` with the default configuration. Protected user endpoints expect `Authorization: Bearer <JWT>`. Admin endpoints marked **Admin** require a token belonging to an admin account. JSON endpoints use `Content-Type: application/json`; upload endpoints use `multipart/form-data`. Responses are JSON; successful responses generally include `status: true`, while errors include `status: false` and a message.

### Users — `/users`

| Method and path | Access | Request | Successful response |
| --- | --- | --- | --- |
| `POST /registration` | Public | `{ "fullName", "email", "password" }` | `201`; `{ status, message, token, user }`. Password must be at least 8 characters and include upper/lowercase letters and a digit. |
| `POST /login` | Public | `{ "email", "password" }` | `200`; `{ status, message, token, user }`. |
| `POST /newsletter` | Public | `{ "email" }` | `200`; confirmation message. |
| `GET /profile` | User | None | `200`; `{ status, message, user }` including profile and content/task counts. |
| `PUT /profile` | User | `fullName`, `bio`, optional `avatar` file | `200`; `{ status, message, user }`. Use multipart form data when uploading an avatar. |
| `GET /public/:userId` | Public | MongoDB user ID in path | `200`; public user details, public posts, and book listings. |
| `GET /activity` | User | None | `200`; `{ status, message, userActivity }` with date/activity entries for roughly the previous year. |
| `PUT /change-password` | User | `{ "oldPassword", "newPassword" }` | `200`; confirmation message. |
| `GET /` | Admin | Optional `?query=` name/email search | `200`; `{ status, message, users }`. |
| `DELETE /:userId` | Admin | User ID in path | `200`; deletion confirmation. |
| `PATCH /:userId/role` | Admin | `{ "role": "user" }` or `{ "role": "admin" }` | `200`; `{ status, message, user }`. |

### Posts — `/posts`

| Method and path | Access | Request | Successful response |
| --- | --- | --- | --- |
| `GET /feed` | Public; optional user token | Query: `page`, `limit`, `search`, `sort` | `200`; paginated feed data (including posts and pagination metadata). |
| `GET /` | User | Query options supported by handler | `200`; `{ status, message, posts }` for the signed-in user's posts. |
| `GET /:postId` | Public/owner for private posts | Post ID | `200`; `{ status, message, post }`. |
| `POST /` | User | `{ "title", "description", "tags", "visibility" }`; tags may be an array or comma-separated string; visibility is `public` or `private` | `201`; `{ status, message, post }`. |
| `PATCH /:postId` | Owner or admin | Any editable post fields: `title`, `description`, `tags`, `visibility` | `200`; updated post response. |
| `DELETE /:postId` | Owner or admin | Post ID | `200`; deletion confirmation. |
| `PATCH /change-visibility/:postId` | Owner or admin | No body; toggles between `public` and `private` | `200`; `{ status, message, visibility }`. |
| `POST /:postId/like` | User | No body | `200`; like state and count (`liked`, `likesCount`). Repeated requests toggle the like. |
| `POST /:postId/reaction` | User | `{ "reactionType": "..." }` | `200` or `201`; adds, changes, or removes the user's reaction. |
| `POST /:postId/comment` | User | `{ "comment" }` | `201`; created comment. |
| `PATCH /:postId/comment/:commentId` | Comment author | `{ "comment" }` | `200`; updated comment response. |
| `DELETE /:postId/comment/:commentId` | Comment author or post owner | Comment ID in path | `200`; deletion confirmation. |

### Products / book listings — `/products`

| Method and path | Access | Request | Successful response |
| --- | --- | --- | --- |
| `GET /explore` | Public | Query: `page`, `limit`, `search`, `category`, `condition`, `sort` (`newest`, `price-low`, `price-high`) | `200`; `{ status, books, totalBooks, totalPages, currentPage }`. |
| `GET /` | User | Optional `limit` and `sort` query parameters | `200`; `{ status, products }` for the signed-in user's listings. |
| `GET /:productId` | Public | Product ID | `200`; `{ status, message, product }`. |
| `POST /` | User | Multipart fields for listing details and required `productimage` file | `201`; `{ status, message, product }`. |
| `PATCH /:productId` | Owner or admin | Multipart fields to update listing; optional `productimage` | `200`; `{ status, message, product }`. |
| `DELETE /:productId` | Owner or admin | Product ID | `200`; deletion confirmation. |

Listing fields include `title`, `bookAuthor`, `price`, `condition`, `category`, `description`, and `contactInfo`. The supported condition values in the update handler are `New`, `Like New`, `Good`, and `Acceptable`.

### Tasks — `/tasks`

All task routes require a user token.

| Method and path | Request | Successful response |
| --- | --- | --- |
| `POST /` | `{ "title", "description", "priority", "selectedDate" }` | `201`; `{ status, message, task }`. |
| `GET /` | Optional `?taskStatus=` | `200`; `{ status, message, tasks }`. |
| `PATCH /:taskId/:taskStatus` | Task ID and new status in path | `200`; `{ status, message, task }`. |
| `DELETE /:taskId` | Task ID in path | `200`; deletion confirmation. |

### Notifications — `/notifications`

All notification routes require a user token.

| Method and path | Request | Successful response |
| --- | --- | --- |
| `GET /` | None | `200`; `{ status, notifications }` (up to 30 latest). |
| `GET /unread-count` | None | `200`; `{ status, count }`. |
| `PATCH /read-all` | None | `200`; confirmation message. |
| `PATCH /:notificationId/read` | Notification ID in path | `200`; `{ status, message, notification }`. |

### Admin — `/admin`

| Method and path | Access | Request | Successful response |
| --- | --- | --- | --- |
| `POST /login` | Public | `{ "email", "password" }` | Route exists, but its handler accepts only `user` role accounts and returns a cookie. The protected admin middleware instead requires an admin-role bearer token, so this flow is currently inconsistent. |
| `GET /profile` | Admin | None | The route is registered; the handler reads `req.user`, while admin middleware sets `req.admin`, so the returned `user` field may be omitted. |
| `GET /log-out` | Public | None | `200`; clears admin cookie. |
| `GET /users` | Admin | None | `200`; `{ status, message, users }`. |
| `GET /users/last-month-count` | Admin | None | `200`; `{ status, message, userCount }` daily counts. |
| `GET /users/role-count` | Admin | None | `200`; `{ status, roleCounts }`. |

The `/tags` router is registered, but its controller functions are empty in the current source; it does not provide working tag endpoints. The admin authentication inconsistencies above are also present in the current implementation.

## Screenshots

The repository includes a project preview image:

![ThinkSpace project preview](preview.png)

## Future Scope

- Add automated API and frontend tests and connect them to package scripts and CI.
- Implement tag management or remove the unused tag routes.
- Integrate the newsletter endpoint with a mailing-list provider and persistence.
- Document deployment configuration for production, including allowed frontend origins and persistent upload storage.
- Add pagination and validation consistently to user-owned content endpoints.

## Contributing

Contributions are welcome. Open an issue to describe a bug or proposed change, then submit a pull request with a clear summary. Keep changes focused, follow the existing JavaScript/React style, and include relevant reproduction steps or screenshots. Do not commit `.env` files, credentials, or uploaded user data.

## License

No root `LICENSE` file is present. The backend `package.json` declares `ISC` metadata, but the repository does not include a project-wide license file; confirm the intended license with the maintainers before redistribution.

## Author

**Pankaj Yadav**
