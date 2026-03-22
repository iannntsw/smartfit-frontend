# SmartFit - AI-Powered Training Application

A comprehensive smart training system that combines computer vision with real-time feedback to help gym beginners and casual gym-goers perform exercises correctly and safely.

## 🚀 Features Implemented

### ✅ Authentication System
- **Sign Up** - Create new user accounts
- **Login** - Secure user authentication
- **Protected Routes** - Only authenticated users can access the app
- **Mock User Data** - Ready to connect to Supabase backend

### ✅ User Profile & Analytics
- **Workout Routines** - Save and manage custom workout plans
- **Exercise History** - Track all completed sessions
- **Progress Charts** - Visualize quality trends, drift detection, and exercise distribution
- **Performance Stats** - Average quality score, total sessions, total reps

### ✅ Live Webcam Training
- **Real-time Computer Vision** - TensorFlow.js pose detection
- **Live Rep Counting** - Automatic rep detection
- **Form Quality Analysis** - Real-time quality scoring (0-100%)
- **Instant Feedback** - Exercise-specific form corrections
- **Webcam Support** - Live camera feed
- **Video Upload** - Upload pre-recorded workout videos
- **Drift Detection** - Alerts when form deteriorates

### ✅ Supported Exercises
1. **Bicep Curl** - Strength training for arms
2. **Dumbbell Lat Raise** - Shoulder development
3. **Push-ups** - Upper body compound movement
4. **Squats** - Lower body strength

### ✅ Subscription Tiers
- **Basic (Free)**
  - Access to all 4 exercises
  - Live webcam tracking
  - Basic rep counting
  - Form quality metrics
  - Exercise history

- **Premium ($9.99/mo)**
  - Everything in Basic
  - AI Chatbot Coach
  - Real-time form corrections
  - Advanced analytics
  - Drift detection alerts
  - Custom routine builder

### ✅ Partnership Features
- **Supplements** - Exclusive discounts on protein, pre-workout, BCAAs
- **Equipment** - Dumbbells, resistance bands, yoga mats
- **Apparel** - Athletic wear and training gear
- **Partner Integration** - Popup deals and product links

### ✅ Trainer Booking System
- **Browse Trainers** - 6 certified professionals with different specialties
- **Trainer Profiles** - Ratings, reviews, experience, certifications
- **Book Sessions** - Schedule 1-on-1 training sessions
- **Specialties** - Strength training, bodybuilding, CrossFit, rehabilitation, yoga, sports performance

### ✅ Responsive Design
- **Mobile-Optimized** - Works on iOS and Android devices
- **Desktop Support** - Full-featured desktop experience
- **Adaptive Layouts** - Responsive grid system
- **Touch-Friendly** - Mobile gesture support

## 📱 Pages & Routes

1. **/** - Landing page with features and testimonials
2. **/login** - User login
3. **/signup** - User registration
4. **/dashboard** - Main hub with quick actions
5. **/profile** - User profile with analytics and charts
6. **/live-training** - Real-time webcam training
7. **/exercises** - Browse all available exercises
8. **/subscription** - Compare and manage subscription plans
9. **/partnerships** - Browse partner products and discounts
10. **/book-trainer** - Find and book personal trainers

## 🛠️ Technology Stack

- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Client-side routing
- **TensorFlow.js** - Machine learning for pose detection
- **Pose Detection Model** - Computer vision for form analysis
- **React Webcam** - Camera integration
- **Recharts** - Data visualization
- **Tailwind CSS v4** - Styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon system
- **Sonner** - Toast notifications

## 🔌 Supabase Integration (Ready)

The app is **ready to connect to Supabase** for:
- User authentication (sign up/login)
- Storing workout routines
- Exercise session history
- Subscription management
- User profiles and preferences

To enable backend functionality:
1. Go to the **Make settings page**
2. Connect your Supabase project
3. The app will automatically use real backend data

## 🎯 Key Features Highlights

### Computer Vision Training
- Uses TensorFlow.js MoveNet model for pose detection
- Tracks body keypoints in real-time
- Analyzes movement patterns
- Provides exercise-specific feedback

### AI Coaching (Premium)
- Real-time form corrections
- Personalized improvement suggestions
- Drift detection for injury prevention
- Exercise quality tracking

### Analytics Dashboard
- Line charts for quality trends
- Bar charts for exercise distribution
- Historical performance tracking
- Progress predictions

## 📊 Mock Data

The app includes realistic mock data for demonstration:
- Pre-populated workout routines
- 30 days of exercise history
- Randomized quality scores and rep counts
- Multiple exercise types

## 🔐 Security Notes

- Currently using mock authentication (no real passwords stored)
- Ready for Supabase Auth integration
- Protected routes prevent unauthorized access
- Session management via React Context

## 🎨 UI/UX Features

- Clean, modern interface
- Gradient backgrounds
- Interactive cards
- Smooth transitions
- Loading states
- Error handling
- Toast notifications
- Modal dialogs
- Responsive navigation

## 📈 Future Enhancements (Post-Supabase Connection)

- Real user authentication
- Persistent data storage
- Payment processing for subscriptions
- Real-time trainer chat
- Social features (friend challenges)
- Achievement badges
- Workout streaks
- Video recording and playback
- Export workout data

## 🚦 Getting Started

1. **Sign Up** - Create an account on the signup page
2. **Explore Dashboard** - View quick actions and exercise library
3. **Start Training** - Click "Live Training" to begin
4. **Select Exercise** - Choose from 4 available exercises
5. **Position Camera** - Set up your webcam
6. **Start Tracking** - Begin your workout with real-time feedback
7. **View Progress** - Check your profile for analytics

## 📝 Notes

- All trainer bookings are currently mock (no real scheduling)
- Partnership links are placeholder URLs
- Payment processing requires Supabase + Stripe integration
- AI chatbot requires OpenAI API integration (Premium feature)
- Video upload processing is simulated

---

Built with ❤️ for fitness enthusiasts by SmartFit
