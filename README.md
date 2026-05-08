# invisible-india-dashboard
"Campus complaint management system."

🏛️ Invinsible India: Civic Issue Reporting Dashboard
Invinsible India is a centralized platform designed to report and track small but serious local civic problems. The system features a dual-portal interface: an Admin Operations Center for management and a Worker Portal for technicians to update progress on assigned tasks.
Developed by VISHAL VISAKAN V.
🚀 Getting Started
Follow these steps to set up the project on a new computer.

1. Prerequisites
Ensure you have the following installed:
• Node.js (v14 or higher)
• MySQL Server
• A Web Browser (Chrome or Edge recommended for the Liquid Glass UI effects)

2. Installation
Clone the Repository:
git clone https://github.com/YOUR_USERNAME/invinsible-india-dashboard.git
Navigate to the Folder:
cd invinsible-india-dashboard
install Dependencies:
npm install

3. Database Setup 🗄️
The project requires a MySQL database to store complaints and technician data.
1.	Open your MySQL Workbench or Command Line.
2.	Navigate to the /database folder in this repository.
3.	Execute the 8 SQL files in the following order to ensure tables and sample data are created correctly:
• Scripts for table structures (e.g., users, complaints, technicians).
• Scripts for initial data/seed files.

4. Configuration
Open server.js in your code editor and update the database connection settings to match your local MySQL credentials:
const db = mysql.createConnection({
    host: 'localhost',
    user: 'your_mysql_username',
    password: 'your_mysql_password',
    database: 'invinsible_india'
});

🖥️ Usage:
Running the Server
Start the backend by running:
node server.js

The server will typically start on http://localhost:3000.
