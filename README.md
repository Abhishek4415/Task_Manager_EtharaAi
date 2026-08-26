========================================================================
#TASKTRACK - FULL-STACK PERFORMANCE MANAGEMENT PLATFORM
========================================================================

TaskTrack is a comprehensive task management and performance analytics 
platform designed for high-efficiency teams. It features role-based 
dashboards, real-time productivity tracking, and detailed attendance 
reporting.

------------------------------------------------------------------------
1. TECH STACK
------------------------------------------------------------------------
- Frontend: React (Vite), Tailwind CSS v4, Lucide Icons, Framer Motion
- Backend: Node.js, Express, TypeScript
- Database: MongoDB (via Mongoose)
- Authentication: JWT (JSON Web Tokens)

------------------------------------------------------------------------
2. FEATURES
------------------------------------------------------------------------
- Real-time Task Tracking: Stop/Start timers for precise AHT calculation.
- Performance Analytics: Dynamic charts (Today, Week, Month, Custom Range).
- Role-based Access:
    * Project Lead (PL): Team management, project creation, leave approval.
    * Quality Reviewer (QR): Task auditing (Approve/Reject), team stats.
    * Tasker: Daily todo list, punching in/out, task progress updates.
- Attendance System: Daily punch-in/out with total working hours tracking.
- Leave Management: Formal application and multi-level approval workflow.
- STEM/Non-STEM Support: Handles both counted and row-based task types.

------------------------------------------------------------------------
3. LOCAL SETUP
------------------------------------------------------------------------
1. Install Dependencies:
   npm run install:all

2. Environment Configuration:
   Create a .env file in the /server directory with:
   - PORT=3000
   - MONGODB_URI=your_mongodb_atlas_uri
   - JWT_SECRET=your_secret_key
   - CLIENT_URL= https://taskmanageretharaai-production-7032.up.railway.app/

3. Run in Development:
   npm run dev:server (starts backend)
   npm run dev:client (starts frontend)

------------------------------------------------------------------------
4. RAILWAY DEPLOYMENT
------------------------------------------------------------------------
This project is pre-configured for Railway deployment via railway.json.

Build Command: npm run build
Start Command: npm start

REQUIRED RAILWAY VARIABLES:
- NODE_ENV: production
- MONGODB_URI: (Your MongoDB Atlas Connection String)
- JWT_SECRET: (A random secret string)

------------------------------------------------------------------------
5. DEFAULT TEST CREDENTIALS (IN-MEMORY MODE)
------------------------------------------------------------------------
If no MONGODB_URI is provided, the server starts in test mode with these:

- Project Lead:
  Email: rohan.mehta@ethara.ai
  Password: 123456

- Quality Reviewer:
  Email: anjali.yadav@ethara.ai
  Password: 123456

- Tasker:
  Email: rahul.sharma@ethara.ai
  Password: 123456


------------------------------------------------------------------------
========================================================================
Video link :- https://drive.google.com/file/d/17Y3M-s_QdNHms9OBos_D6A4rIe2EjVs-/view?usp=sharing
