# Real Communication App

A real-time communication web application that allows users to register, log in, and communicate through a browser-based meeting interface. The application uses a Node.js and Express.js backend with MongoDB for storing user information.

## Features

* User Registration
* User Login
* User Authentication
* User Profile
* Camera Access
* Microphone Access
* Real-Time Meeting Interface
* Video and Audio Communication
* Meeting Controls
* MongoDB Database
* Responsive Web Interface

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* MongoDB Atlas

### Communication

* WebRTC

### Development Tools

* Visual Studio Code
* Git
* GitHub

## Project Structure

```text
real-communication-app/
│
├── index.html
├── login.html
├── register.html
├── meeting.html
├── style.css
├── meeting.css
├── script.js
└── meeting.js
│
│
├── server.js
├── package.json
├── package-lock.json
├── .env
└── README.md
```

## How to Run the Project

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Open the Project Folder

```bash
cd real-communication-app
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure MongoDB

Create a `.env` file in the project folder.

```env
MONGODB_URI=mongodb+srv://rtc_megha:Megha2006@cluster0.plqzsyl.mongodb.net/real_time_communication
PORT=5001
```

Replace the MongoDB connection string with your own MongoDB Atlas connection string.

### 5. Start the Server

```bash
node server.js
```

### 6. Open the Application

Open the following address in your browser:

```text
http://localhost:5000
```

## How the Application Works

1. The user opens the application.
2. The user creates an account using the registration page.
3. User information is stored in MongoDB.
4. The user logs in using their credentials.
5. After successful login, the user can access the communication/meeting interface.
6. The browser requests permission to access the camera and microphone.
7. WebRTC is used for real-time audio and video communication.
8. Express.js handles the backend functionality.
9. MongoDB stores the required user information.

## Database

MongoDB is used to store application data such as:

* User name
* Email
* Username
* Password/authentication information
* User profile information

## Security

Sensitive configuration information such as the MongoDB connection string is stored in a `.env` file and should not be uploaded to GitHub.

Add the following to `.gitignore`:

```text
.env
node_modules/
uploads/
```

## Future Improvements

* Group video meetings
* Meeting room IDs
* Screen sharing
* Chat during meetings
* Meeting history
* User profile customization
* Notifications
* Better authentication
* Cloud deployment
* HTTPS support
* Improved WebRTC signaling

## Author

Developed as a real-time communication web application using HTML, CSS, JavaScript, Node.js, Express.js, MongoDB, and WebRTC.
