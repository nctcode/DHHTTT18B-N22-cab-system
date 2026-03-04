# CAB Passenger App

React + Vite frontend application for passengers to book and track rides.

## ✨ Features

- 🔐 **Authentication**: Login/Register with JWT
- 🗺️ **Ride Booking**: Select pickup → destination → vehicle type
- 💰 **Price Estimation**: Real-time fare calculation
- 🔍 **Driver Matching**: Real-time driver search with Socket.IO
- 📍 **Live Tracking**: GPS-based ride tracking
- 💳 **Payment**: Multiple payment methods (Cash, Card, Wallet)
- ⭐ **Reviews**: Rate drivers after each ride
- 📋 **History**: View past rides
- 👤 **Profile**: Manage account and wallet

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- Backend API Gateway running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update VITE_API_GATEWAY_URL in .env if needed
```

### Development

```bash
npm run dev
```

App will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── pages/           # All screen components
│   ├── SplashScreen.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Home.jsx
│   ├── Destination.jsx
│   ├── RideOptions.jsx
│   ├── SearchingDriver.jsx
│   ├── RideTracking.jsx
│   ├── Payment.jsx
│   ├── Rating.jsx
│   ├── RideHistory.jsx
│   ├── Profile.jsx
│   └── Wallet.jsx
├── components/      # Reusable UI components
│   ├── Button.jsx
│   ├── Input.jsx
│   └── LoadingSpinner.jsx
├── services/        # API and Socket.IO services
│   ├── api.js
│   ├── authService.js
│   ├── socketService.js
│   └── index.js
├── contexts/        # React Context providers
│   └── AuthContext.jsx
└── App.jsx          # Main app with routing
```

## 🔌 API Integration

All API calls go through the API Gateway (`VITE_API_GATEWAY_URL`):

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/bookings` - Create booking
- `GET /api/rides/:id` - Get ride details
- `POST /api/pricing/calculate` - Calculate fare
- `POST /api/payments` - Process payment
- `POST /reviews` - Submit review
- `GET /api/rides/user/:userId` - Get ride history

## 🔄 Real-time Features

Uses Socket.IO for:
- `driver_matched` - Driver assigned to booking
- `location_update` - Real-time GPS updates
- `ride_status_update` - Ride status changes

## 🎨 Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State**: React Query + Context API
- **Real-time**: Socket.IO Client
- **Notifications**: React Hot Toast

## 📝 Environment Variables

```env
VITE_API_GATEWAY_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_SOCKET_URL=http://localhost:3000
```

## 🧪 Testing

To test the app:
1. Start backend services (`docker-compose up`)
2. Run `npm run dev`
3. Register/Login as a passenger
4. Book a ride
5. (Use Driver App or Postman to simulate driver accepting ride)

## 📦 Dependencies

Main dependencies:
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `socket.io-client` - Real-time communication
- `@tanstack/react-query` - Server state management
- `react-hot-toast` - Toast notifications
- `tailwindcss` - Styling

## 🔧 Notes

- **Maps**: Currently using placeholders. Integrate Google Maps or Mapbox for production.
- **Authentication**: JWT tokens stored in localStorage
- **Token Refresh**: Automatically handled by Axios interceptors
- **Error Handling**: Toast notifications for all errors

## 📄 License

ISC
