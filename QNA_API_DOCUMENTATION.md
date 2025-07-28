# QnA Forum API Documentation

## 🎯 **Overview**
Complete API reference for the QnA Forum application with authentication, questions, answers, and voting system.

## 📚 **Table of Contents**
1. [Authentication APIs](#authentication-apis)
2. [Question APIs](#question-apis)
3. [Answer APIs](#answer-apis)
4. [Error Handling](#error-handling)
5. [Frontend Integration Examples](#frontend-integration-examples)

---

## 🔐 **Authentication APIs**

### Base URL: `/api/auth`

#### Register User
- **POST** `/api/auth/register`
- **Content-Type**: `multipart/form-data`
- **Body**: `name`, `email`, `password`, `confirmPassword`, `avatar` (optional file)

#### Login User
- **POST** `/api/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "password123" }`

#### Logout User
- **POST** `/api/auth/logout`
- **Auth**: Required

#### Update Avatar
- **PATCH** `/api/auth/update-avatar`
- **Content-Type**: `multipart/form-data`
- **Auth**: Required
- **Body**: `avatar` (file)

---

## ❓ **Question APIs**

### Base URL: `/api/questions`

### 1. **Get All Questions** (Homepage)
```http
GET /api/questions?page=1&limit=10&sortBy=createdAt&sortOrder=desc&search=&tags=
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field - `createdAt`, `title` (default: `createdAt`)
- `sortOrder` (optional): `asc` or `desc` (default: `desc`)
- `search` (optional): Search in title/description
- `tags` (optional): Filter by tags

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "questions": [
      {
        "_id": "question_id",
        "title": "How to use React hooks?",
        "description": "I'm learning React and need help with hooks...",
        "tags": "react, javascript, hooks",
        "owner": {
          "_id": "user_id",
          "name": "John Doe",
          "avatar": "https://cloudinary.com/avatar.jpg"
        },
        "answerCount": 5,
        "hasAcceptedAnswer": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalQuestions": 95,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Questions fetched successfully"
}
```

### 2. **Submit New Question**
```http
POST /api/questions
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "How to implement authentication in Node.js?",
  "description": "I'm building a web app and need help with user authentication...",
  "tags": "nodejs, authentication, security"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "question_id",
    "title": "How to implement authentication in Node.js?",
    "description": "I'm building a web app...",
    "tags": "nodejs, authentication, security",
    "owner": {
      "_id": "user_id",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/avatar.jpg"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Question submitted successfully"
}
```

### 3. **Get Single Question with Answers**
```http
GET /api/questions/{questionId}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "question_id",
    "title": "How to use React hooks?",
    "description": "Detailed question description...",
    "tags": "react, javascript, hooks",
    "owner": {
      "_id": "user_id",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/avatar.jpg"
    },
    "answers": [
      {
        "_id": "answer_id",
        "body": "You can use useState hook like this...",
        "votes": 5,
        "isAccepted": true,
        "owner": {
          "_id": "answerer_id",
          "name": "Jane Smith",
          "avatar": "https://cloudinary.com/avatar2.jpg"
        },
        "createdAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "answerCount": 3,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Question fetched successfully"
}
```

### 4. **Update Question** (Owner Only)
```http
PATCH /api/questions/{questionId}
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "title": "Updated question title",
  "description": "Updated description...",
  "tags": "updated, tags"
}
```

### 5. **Delete Question** (Owner Only)
```http
DELETE /api/questions/{questionId}
Authorization: Bearer <access_token>
```

### 6. **Get User's Questions**
```http
GET /api/questions/user/{userId}?page=1&limit=10
```

### 7. **Get Trending Questions**
```http
GET /api/questions/trending?limit=5
```

---

## 💬 **Answer APIs**

### Base URL: `/api/answers`

### 1. **Submit Answer to Question**
```http
POST /api/answers/question/{questionId}
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "body": "Here's how you can solve this problem..."
}
```

### 2. **Vote on Answer**
```http
POST /api/answers/{answerId}/vote
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "value": 1  // 1 for upvote, -1 for downvote
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "action": "created", // "created", "updated", or "removed"
    "value": 1
  },
  "message": "Vote added successfully"
}
```

### 3. **Accept Answer** (Question Owner Only)
```http
PATCH /api/answers/{answerId}/accept
Authorization: Bearer <access_token>
```

### 4. **Update Answer** (Owner Only)
```http
PATCH /api/answers/{answerId}
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "body": "Updated answer content..."
}
```

### 5. **Delete Answer** (Owner Only)
```http
DELETE /api/answers/{answerId}
Authorization: Bearer <access_token>
```

### 6. **Get User's Answers**
```http
GET /api/answers/user/{userId}?page=1&limit=10
```

### 7. **Get User Vote Status for Answer**
```http
GET /api/answers/{answerId}/vote-status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "hasVoted": true,
    "voteValue": 1  // 1, -1, or null
  },
  "message": "Vote status fetched successfully"
}
```

---

## 🚨 **Error Handling**

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Title, description, and tags are required"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token is required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "You can only edit your own questions"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Question not found"
}
```

---

## 🖥️ **Frontend Integration Examples**

### React.js Implementation

#### 1. **Fetch Questions for Homepage**
```javascript
import axios from 'axios';

const fetchQuestions = async (page = 1, search = '', tags = '') => {
  try {
    const response = await axios.get('/api/questions', {
      params: { page, limit: 10, search, tags, sortBy: 'createdAt', sortOrder: 'desc' }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

// Usage in React component
const QuestionsPage = () => {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        const data = await fetchQuestions();
        setQuestions(data.data.questions);
        setPagination(data.data.pagination);
      } catch (error) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {questions.map(question => (
            <div key={question._id} className="question-card">
              <h3>{question.title}</h3>
              <p>{question.description}</p>
              <div className="meta">
                <span>By {question.owner.name}</span>
                <span>{question.answerCount} answers</span>
                <span>{question.tags}</span>
              </div>
            </div>
          ))}
          
          {/* Pagination */}
          <Pagination 
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
          />
        </div>
      )}
    </div>
  );
};
```

#### 2. **Submit New Question**
```javascript
const submitQuestion = async (questionData, token) => {
  try {
    const response = await axios.post('/api/questions', questionData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting question:', error);
    throw error;
  }
};

// React component
const AskQuestion = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      await submitQuestion(formData, token);
      // Redirect to questions page or show success message
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Question title"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      <textarea
        placeholder="Describe your question in detail"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Tags (comma separated)"
        value={formData.tags}
        onChange={(e) => setFormData({...formData, tags: e.target.value})}
        required
      />
      <button type="submit">Submit Question</button>
    </form>
  );
};
```

#### 3. **Question Detail with Answers**
```javascript
const QuestionDetail = ({ questionId }) => {
  const [question, setQuestion] = useState(null);
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const response = await axios.get(`/api/questions/${questionId}`);
        setQuestion(response.data.data);
      } catch (error) {
        console.error('Error fetching question:', error);
      }
    };

    fetchQuestion();
  }, [questionId]);

  const submitAnswer = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`/api/answers/question/${questionId}`, 
        { body: newAnswer },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      setNewAnswer('');
      // Refresh question data
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const voteAnswer = async (answerId, value) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`/api/answers/${answerId}/vote`,
        { value },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      // Refresh question data
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (!question) return <div>Loading...</div>;

  return (
    <div>
      <div className="question">
        <h1>{question.title}</h1>
        <p>{question.description}</p>
        <div className="meta">
          <span>Asked by {question.owner.name}</span>
          <span>{question.tags}</span>
        </div>
      </div>

      <div className="answers">
        <h3>{question.answerCount} Answers</h3>
        {question.answers.map(answer => (
          <div key={answer._id} className="answer">
            <div className="vote-section">
              <button onClick={() => voteAnswer(answer._id, 1)}>↑</button>
              <span>{answer.votes}</span>
              <button onClick={() => voteAnswer(answer._id, -1)}>↓</button>
            </div>
            <div className="answer-content">
              <p>{answer.body}</p>
              <div className="answer-meta">
                <span>By {answer.owner.name}</span>
                {answer.isAccepted && <span className="accepted">✓ Accepted</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="submit-answer">
        <h3>Your Answer</h3>
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Write your answer here..."
        />
        <button onClick={submitAnswer}>Submit Answer</button>
      </div>
    </div>
  );
};
```

### **Key Features Implemented:**

✅ **Question Management**: Create, read, update, delete questions  
✅ **Answer System**: Submit answers, vote, accept answers  
✅ **User Authentication**: Protected routes, owner permissions  
✅ **Search & Filter**: Search by title/description, filter by tags  
✅ **Pagination**: Efficient data loading  
✅ **Voting System**: Upvote/downvote answers with vote tracking  
✅ **Rich Responses**: Populated user data, answer counts, vote scores  
✅ **Error Handling**: Comprehensive error responses  
✅ **Performance**: Optimized database queries with aggregation  

This complete implementation provides all the functionality needed for a professional QnA forum platform!
