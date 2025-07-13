# Hackfolio

An AI-powered resume builder using the MERN stack that helps users create professional resumes with intelligent suggestions and formatting.

## Project Structure

This project follows a monorepo structure with separate client and server applications:

```
hackfolio/
├── client/          # Frontend React application (Vite + React + Tailwind CSS)
├── server/          # Backend Express API server
├── README.md        # Project documentation
└── .gitignore      # Git ignore rules
```

## Features

- **AI-Powered Resume Building**: Intelligent suggestions for resume content
- **Modern Tech Stack**: Built with React, Express, MongoDB, and Node.js
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **User Authentication**: Secure user registration and login
- **Resume Templates**: Multiple professional resume templates
- **Export Options**: Download resumes in PDF format

## Tech Stack

### Frontend (Client)
- **React 19**: Modern React with hooks and latest features
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Axios**: HTTP client for API requests

### Backend (Server)
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **MongoDB**: NoSQL database for data storage
- **JWT**: JSON Web Tokens for authentication
- **bcrypt**: Password hashing for security

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pranjal-045/snapQuiz.git
   cd snapQuiz
   ```

2. **Install client dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install server dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Environment Setup**
   Create a `.env` file in the server directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/hackfolio
   JWT_SECRET=your_jwt_secret_here
   PORT=5001
   ```

### Development

1. **Start the server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the client** (in a new terminal)
   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

### Building for Production

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Start the production server**
   ```bash
   cd server
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

### Resume Management
- `GET /api/resumes` - Get user's resumes
- `POST /api/resumes` - Create new resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue on GitHub or contact the development team.
