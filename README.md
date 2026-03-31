# evaluAItw — AI-Powered Essay Grading Platform

**evaluAItw** helps teachers grade essays efficiently while keeping grading fair and fully under the teacher's control. AI suggestions are always optional—the teacher reviews every single grade before anything is published.

---

## Features

- 🔐 **Authentication** — Secure login/register with JWT
- 📚 **Class & Assignment Management** — Organize students and assignments
- 📋 **Rubric Builder** — Create grading categories with point values
- ✍️ **Teacher Guidance** — Input grading philosophy and preferences
- 📄 **Essay Upload** — Upload DOCX and ODF files; text is parsed automatically
- ✋ **Manual Grading (First 3)** — Teacher must manually grade the first 3 essays
- 🤖 **AI Grading Engine** — Learns your grading style from those first 3 essays
- 👁️ **Review Queue** — Review every AI-graded essay before finalizing
- 🔒 **Finalize & Publish** — Locked until all essays are reviewed
- 📊 **Audit Trail** — Every AI suggestion vs. teacher decision is tracked

---

## Tech Stack

| Layer      | Technology                         |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS      |
| Backend    | Node.js + Express                   |
| Database   | SQLite (via `better-sqlite3`)       |
| Auth       | JWT (`jsonwebtoken` + `bcryptjs`)   |
| File Parse | `mammoth` (DOCX), `yauzl` (ODF/ODT) |
| AI         | OpenAI `gpt-4o-mini` (with mock fallback) |

---

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- (Optional) An OpenAI API key for live AI grading

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/kylemuniz/evaluAIte.git
cd evaluAIte
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set your values:

```env
PORT=3001
JWT_SECRET=change-this-to-a-long-random-string
OPENAI_API_KEY=sk-...          # Leave blank for mock AI mode
DATABASE_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:5173
```

Seed the database with sample data:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev     # Development (auto-restart on changes)
# or
npm start       # Production
```

The API will be available at **http://localhost:3001**

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Demo Credentials

After running the seed script:

| Field    | Value                   |
|----------|-------------------------|
| Email    | `teacher@school.edu`    |
| Password | `password123`           |

The seed data includes:
- 1 class: "English 101"
- 1 assignment: "The Great Gatsby Essay"
- 4-category rubric (Thesis, Evidence, Analysis, Writing Quality)
- 5 student essays (3 manually graded, 2 awaiting AI grading)

---

## Core Workflow

```
1. Log in
2. Create a class
3. Create an assignment
4. Build a rubric (categories + point values)
5. Add teacher guidance (grading philosophy, preferences)
6. Upload student essays (.docx or .odt)
7. Manually grade the first 3 essays
8. Click "Run AI Grading" — AI learns from your 3 grades
9. Review each AI-graded essay individually
10. Edit any grade or comment as needed
11. Click "Finalize & Publish" (available only when all essays are reviewed)
```

---

## API Overview

### Auth
| Method | Path                  | Description        |
|--------|-----------------------|--------------------|
| POST   | `/api/auth/register`  | Create account     |
| POST   | `/api/auth/login`     | Log in, get token  |

### Classes
| Method | Path               | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/classes`     | List teacher classes |
| POST   | `/api/classes`     | Create class        |
| GET    | `/api/classes/:id` | Get class details   |
| PUT    | `/api/classes/:id` | Update class        |
| DELETE | `/api/classes/:id` | Delete class        |

### Assignments
| Method | Path                                  | Description                  |
|--------|---------------------------------------|------------------------------|
| POST   | `/api/assignments`                    | Create assignment             |
| GET    | `/api/assignments/:id`                | Get assignment + rubric      |
| PUT    | `/api/assignments/:id`                | Update assignment             |
| POST   | `/api/assignments/:id/rubric`         | Save rubric categories        |
| POST   | `/api/assignments/:id/guidance`       | Save teacher guidance         |
| POST   | `/api/assignments/:id/essays`         | Upload essays (multipart)     |
| GET    | `/api/assignments/:id/essays`         | List all essays + grades      |
| POST   | `/api/assignments/:id/ai-grade`       | Trigger AI grading            |
| POST   | `/api/assignments/:id/finalize`       | Finalize & publish            |

### Essays & Grades
| Method | Path                         | Description                   |
|--------|------------------------------|-------------------------------|
| GET    | `/api/essays/:id`            | Get essay with full details   |
| POST   | `/api/essays/:id/grade`      | Submit manual teacher grade   |
| PUT    | `/api/essays/:id/review`     | Review/override AI grade      |

---

## Essay Status Flow

```
uploaded → manually_graded (first 3 only)
uploaded → ai_graded       (remaining essays)
ai_graded → reviewed       (after teacher review)
reviewed → finalized       (after "Finalize & Publish")
```

---

## AI Grading Details

When AI grading is triggered, the system:
1. Sends the rubric and teacher guidance as context
2. Includes the first 3 manually graded essays as few-shot examples
3. Asks GPT-4o-mini to grade each remaining essay following the teacher's style

The AI returns for each essay:
- Suggested numeric grade (0–100)
- Letter grade
- Rubric category scores
- Strengths / areas for improvement
- Reasoning explanation
- Confidence score (0–1)

**If `OPENAI_API_KEY` is not set**, the service returns realistic mock responses so you can demo the full workflow without API costs.

---

## Project Structure

```
evaluAIte/
├── backend/
│   ├── src/
│   │   ├── app.js               Express app setup
│   │   ├── server.js            Entry point
│   │   ├── middleware/
│   │   │   └── auth.js          JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── classes.js
│   │   │   ├── assignments.js
│   │   │   ├── essays.js
│   │   │   ├── grades.js
│   │   │   └── rubrics.js
│   │   ├── services/
│   │   │   ├── aiService.js     OpenAI + mock fallback
│   │   │   ├── fileParser.js    DOCX/ODT text extraction
│   │   │   └── database.js      SQLite singleton
│   │   └── db/
│   │       ├── schema.js        Table creation
│   │       └── seed.js          Sample data
│   ├── uploads/                 Uploaded essay files
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js        Axios instance
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RubricBuilder.jsx
│   │   │   ├── EssayCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── ProgressBar.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── ClassDetail.jsx
│   │       ├── NewAssignment.jsx
│   │       ├── AssignmentDetail.jsx
│   │       ├── ManualGrade.jsx
│   │       └── ReviewEssay.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Environment Variables

### Backend (`.env`)

| Variable        | Default                          | Description                        |
|-----------------|----------------------------------|------------------------------------|
| `PORT`          | `3001`                           | Backend server port                |
| `JWT_SECRET`    | *(required)*                     | Secret key for JWT signing         |
| `OPENAI_API_KEY`| *(optional)*                     | OpenAI key; blank = mock mode      |
| `DATABASE_PATH` | `./database.sqlite`              | SQLite file path                   |
| `CORS_ORIGIN`   | `http://localhost:5173`          | Allowed frontend origin            |

---

## Security & Privacy Notes

- All routes (except auth) require a valid JWT Bearer token
- Essays are stored server-side; only accessible to the owning teacher
- AI grades are never finalized automatically—teacher review is mandatory
- Rate limiting: 20 auth attempts / 300 API requests per 15 minutes
- Password hashing via `bcryptjs` (12 rounds)

---

## Stretch Features (Optional)

- [ ] Export grades to CSV
- [ ] Grade distribution dashboard
- [ ] Plagiarism flag placeholder
- [ ] Rubric templates library
