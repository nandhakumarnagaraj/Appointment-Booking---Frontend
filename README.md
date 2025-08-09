📅 Appointment Booking - Frontend

This is the React-based frontend for the Appointment Booking System.
It allows patients to register, log in, view available appointment slots, and book them.
Admins can manage slots and view bookings.

🚀 Features

1. JWT-based authentication (patient & admin login)

2. Role-based UI (admin and patient)

3. View available slots

4. Book appointments

5. Responsive UI for desktop and mobile

📂 Project Structure

frontend/

 ├── src/
 |   |
 │   ├── components/     # Reusable UI components
 |   |
 │   ├── pages/          # Pages (Login, Register, Dashboard, etc.)
 |   |
 │   ├── services/       # API calls to backend
 |   |
 │   ├── App.js          # Main app entry
 |   |
 │   ├── index.js        # React DOM entry
 |
 ├── public/
 |
 ├── package.json
 |
 └── README.md
 
 
🛠️ Prerequisites

Node.js v18+

npm or yarn

Backend API running (see backend repo)

📦 Installation
Clone the repository

git clone [https://github.com//appointment-booking-frontend.git](https://github.com/nandhakumarnagaraj/Appointment-Booking---Frontend)

cd appointment-booking-frontend
Install dependencies

npm install
Configure Environment Variables
Create a .env file in the root:

REACT_APP_API_URL=http://localhost:5000
Run the app

npm start
Frontend will run at:

http://localhost:3000
🔗 Connecting to Backend
Make sure your backend is running and accessible at the URL in .env (REACT_APP_API_URL).
If hosting separately, update .env to the correct backend URL.

📸 Screenshots
<img width="1919" height="866" alt="image" src="https://github.com/user-attachments/assets/f62bf497-8710-4af6-a19d-017356fbc71c" />
<img width="1919" height="865" alt="image" src="https://github.com/user-attachments/assets/10b3f4e9-2bae-4cc2-8e33-0333b0baf8f2" />
<img width="1919" height="861" alt="image" src="https://github.com/user-attachments/assets/42a08696-98fe-4ad5-b992-8e5fd645b80a" />
<img width="1915" height="868" alt="image" src="https://github.com/user-attachments/assets/18fa6413-81e8-41ef-80c3-f73e51394681" />



👨‍💻 Author
Your Name
LinkedIn | GitHub
