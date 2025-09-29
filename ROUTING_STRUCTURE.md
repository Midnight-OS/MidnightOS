# MidnightOS Frontend Routing Structure

## Complete Route Map

```
src/app/
├── (auth)/                      # Authentication routes (public)
│   ├── layout.tsx              # Auth layout with centered card
│   ├── login/
│   │   └── page.tsx           # Login page with social auth
│   ├── register/
│   │   └── page.tsx           # Registration page
│   └── forgot-password/
│       └── page.tsx           # Password recovery
│
├── (protected)/                 # Protected routes (requires auth)
│   ├── layout.tsx              # Dashboard layout with sidebar & breadcrumbs
│   └── dashboard/
│       ├── page.tsx            # Dashboard overview
│       ├── bots/
│       │   ├── page.tsx        # Bot management
│       │   ├── create/
│       │   │   └── page.tsx    # Create new bot
│       │   └── [id]/
│       │       ├── page.tsx    # Bot details
│       │       └── settings/
│       │           └── page.tsx # Bot settings
│       ├── wallet/
│       │   ├── page.tsx        # Wallet overview
│       │   ├── send/
│       │   │   └── page.tsx    # Send tokens
│       │   ├── shield/
│       │   │   └── page.tsx    # Shield tokens
│       │   └── transactions/
│       │       └── page.tsx    # Transaction history
│       ├── treasury/
│       │   ├── page.tsx        # DAO treasury overview
│       │   ├── proposals/
│       │   │   └── page.tsx    # Treasury proposals
│       │   └── funding/
│       │       └── page.tsx    # Fund treasury
│       ├── contracts/
│       │   ├── page.tsx        # Smart contracts
│       │   ├── deploy/
│       │   │   └── page.tsx    # Deploy contract
│       │   └── [address]/
│       │       └── page.tsx    # Contract details
│       ├── proposals/
│       │   ├── page.tsx        # All proposals
│       │   ├── create/
│       │   │   └── page.tsx    # Create proposal
│       │   └── [id]/
│       │       └── page.tsx    # Proposal details
│       ├── analytics/
│       │   └── page.tsx        # Analytics dashboard
│       ├── notifications/
│       │   └── page.tsx        # Notifications center
│       └── settings/
│           ├── page.tsx        # Account settings
│           ├── profile/
│           │   └── page.tsx    # Profile settings
│           ├── security/
│           │   └── page.tsx    # Security settings
│           └── billing/
│               └── page.tsx    # Billing & subscription
│
├── (public)/                    # Public routes
│   ├── page.tsx                # Landing page
│   ├── features/
│   │   └── page.tsx           # Features showcase
│   ├── pricing/
│   │   └── page.tsx           # Pricing plans
│   ├── docs/
│   │   └── page.tsx           # Documentation
│   ├── blog/
│   │   └── page.tsx           # Blog posts
│   ├── about/
│   │   └── page.tsx           # About page
│   ├── contact/
│   │   └── page.tsx           # Contact form
│   ├── terms/
│   │   └── page.tsx           # Terms of service
│   └── privacy/
│       └── page.tsx           # Privacy policy
│
├── onboarding/                  # Onboarding flow
│   └── page.tsx                # Multi-step onboarding
│
├── layout.tsx                   # Root layout
└── globals.css                  # Global styles
```

## Key Features Implemented

### 1. **Authentication Flow**
- Login with email/password
- Social login (Google, GitHub)
- Registration with validation
- Password recovery
- Protected route middleware

### 2. **Dashboard Structure**
- Overview with stats cards
- Quick actions grid
- Recent activity feed
- Bot status monitoring
- Real-time updates

### 3. **Bot Management**
- Create/Edit/Delete bots
- Bot configuration
- Platform connections (Discord, Telegram)
- Performance metrics
- Grid/List view toggle

### 4. **Wallet Features**
- Balance display (transparent/shielded)
- Send/Receive tokens
- Shield/Unshield operations
- Transaction history
- Address management

### 5. **DAO Treasury**
- Treasury balance
- Proposal creation
- Voting interface
- Funding requests
- Treasury analytics

### 6. **Smart Contracts**
- Deploy contracts
- Contract interaction
- Transaction monitoring
- Gas estimation
- Contract verification

### 7. **UI Components**

#### Breadcrumbs
- Auto-generated from route
- Custom items support
- Icon support
- Interactive navigation

#### Sidebar
- Floating design (TokenIQ-inspired)
- Active state indicators
- Badge system
- User profile card
- Quick stats

#### Cards
- Glass morphism effect
- Hover animations
- Status indicators
- Action buttons
- Gradient backgrounds

### 8. **Responsive Design**
- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Adaptive navigation

### 9. **Theme Support**
- Dark/Light mode
- System preference
- Custom color schemes
- Consistent theming

### 10. **Animation**
- Framer Motion
- Page transitions
- Micro-interactions
- Loading states
- Hover effects

## Navigation Flow

```
Landing Page
    ↓
Login/Register
    ↓
Onboarding (new users)
    ↓
Dashboard
    ├── Bots → Create/Manage/Settings
    ├── Wallet → Send/Shield/History
    ├── Treasury → Proposals/Voting
    ├── Contracts → Deploy/Interact
    ├── Analytics → Charts/Metrics
    └── Settings → Profile/Security
```

## Next.js 15 Features Used

- **App Router**: File-based routing with layouts
- **Route Groups**: `(auth)`, `(protected)`, `(public)`
- **Dynamic Routes**: `[id]`, `[address]`
- **Layouts**: Shared UI between routes
- **Server Components**: Default for better performance
- **Client Components**: Interactive features
- **Middleware**: Authentication checks
- **API Routes**: Backend functionality

## Dependencies Installed

- **UI Framework**: React 19, Next.js 15
- **Styling**: Tailwind CSS, PostCSS
- **Components**: Radix UI, Headless UI
- **Animation**: Framer Motion
- **Forms**: React Hook Form, Zod
- **State**: Zustand
- **Charts**: Chart.js, Recharts
- **Icons**: Lucide React, Hero Icons
- **Utilities**: date-fns, clsx, tailwind-merge

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=MidnightOS
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:4000
```

## Running the Frontend

```bash
cd platform/frontend
npm install
npm run dev
```

Visit: http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```

## TypeScript Configuration

- Strict mode enabled
- Path aliases configured
- Type checking on build
- ESLint integration

## Clean Code Practices

1. **Component Structure**: Atomic design pattern
2. **Type Safety**: Full TypeScript coverage
3. **Code Splitting**: Dynamic imports
4. **Performance**: Optimized images, lazy loading
5. **Accessibility**: ARIA labels, keyboard navigation
6. **Testing Ready**: Component isolation
7. **Documentation**: JSDoc comments
8. **Error Handling**: Error boundaries
9. **SEO**: Meta tags, structured data
10. **Security**: Input validation, XSS protection