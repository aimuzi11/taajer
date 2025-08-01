# Tajir - AI Shopping Assistant

## Overview

Tajir is a comprehensive ChatGPT-like chatbot platform with admin panel, knowledge base management, and e-commerce functionality. Users can chat with an AI assistant powered by OpenAI's GPT-4o model while admins can manage content and products. The platform includes purchasing capabilities integrated directly into the chat interface, allowing users to buy products through conversations with the AI assistant.

## User Preferences

Preferred communication style: Simple, everyday language.
Admin access code: aiman

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend:

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: PostgreSQL database with persistent storage
- **AI Integration**: OpenAI API for chat responses
- **Storage**: PostgreSQL database for all data persistence

### Database Schema
The application uses seven main tables:
- **users**: Store user accounts with username/password authentication
- **messages**: Store chat messages with role (user/assistant), content, and session tracking
- **knowledgeBase**: Store knowledge base articles with title, content, category, tags, and status
- **adminSessions**: Store admin authentication sessions with expiration tracking
- **products**: Store product catalog with name, description, pricing, inventory, and availability
- **orders**: Store customer orders with product details, customer information, and order status

## Key Components

### Frontend Components
- **Chat Page**: Main chat interface with message display and input
- **Admin Login**: Secure authentication page for admin access
- **Admin Dashboard**: Knowledge base management interface with CRUD operations
- **UI Components**: Comprehensive set of accessible components from shadcn/ui
- **Query Client**: Centralized API request handling with error management
- **Toast System**: User feedback and notification system

### Backend Services
- **Route Handlers**: RESTful API endpoints for chat operations and admin management
- **Storage Layer**: Abstracted storage interface with PostgreSQL database implementation
- **OpenAI Service**: AI response generation with conversation context and knowledge base integration
- **Admin Authentication**: Code-based authentication system with session management
- **Knowledge Base Management**: CRUD operations for knowledge base articles
- **Database Layer**: PostgreSQL connection with Drizzle ORM for type-safe queries
- **Middleware**: Request logging, error handling, and admin authentication

### Shared Resources
- **Schema Definitions**: Shared TypeScript types and Zod schemas
- **Database Models**: Drizzle schema definitions for type safety

## Data Flow

### Chat Flow
1. **User Input**: User types message in chat interface
2. **Frontend Processing**: Message is validated and sent via TanStack Query
3. **Backend Processing**: 
   - User message is saved to database
   - Knowledge base is searched for relevant context
   - Conversation history is retrieved for context
   - OpenAI API is called with conversation context and knowledge base data
   - AI response is saved to database
4. **Response Delivery**: Frontend receives response and updates UI
5. **Real-time Updates**: Chat history is refreshed to show new messages

### Admin Flow
1. **Admin Authentication**: Admin enters access code "aiman" to login
2. **Session Management**: Server creates secure session token with 24-hour expiration
3. **Knowledge Base Management**: Admin can create, read, update, delete knowledge base articles
4. **Search & Filter**: Admin can search and categorize knowledge base entries
5. **AI Integration**: Knowledge base data is automatically used to enhance AI responses

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **openai**: Official OpenAI API client
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety and developer experience
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- In-memory storage for rapid prototyping
- Environment variable configuration for API keys
- TypeScript compilation and type checking

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild bundles Node.js server to `dist/index.js`
- **Database**: PostgreSQL database with Drizzle schema management
- **Environment**: Production-ready with persistent PostgreSQL storage

### Configuration Management
- Environment variables for database URL and API keys
- Separate development and production configurations
- TypeScript path mapping for clean imports
- PostCSS configuration for Tailwind processing

The architecture prioritizes developer experience with TypeScript throughout, modern tooling, and a clean separation of concerns between frontend and backend while maintaining type safety across the full stack.

## Recent Implementation Updates (August 2025)

### Mobile Optimization (August 1, 2025)
- **Responsive Design**: Complete mobile optimization with adaptive layouts for all screen sizes
- **Mobile-First Chat Interface**: Responsive chat messages with optimal touch targets and spacing
- **Hidden Desktop Sidebar**: Product recommendations sidebar hidden on mobile, replaced with horizontal scroll banner
- **Mobile Action Buttons**: Profile and cart buttons moved to header on mobile devices with icon-only display
- **Adaptive Input Area**: Message input and action buttons stack vertically on mobile for better usability
- **Touch-Friendly Gallery**: ProductImageGallery component optimized with always-visible navigation on mobile
- **Responsive Grid Layouts**: Image search results and product grids adapt from 1 column on mobile to 4 columns on desktop
- **Mobile Dialog Optimization**: Product expansion dialogs sized appropriately for mobile screens with scroll support

### Currency & Multi-Image System (August 1, 2025)
- **AED Currency Support**: Complete conversion from USD to AED format throughout the application
- **Multi-Image Products**: Enhanced database schema and UI to support multiple images per product
- **Interactive Image Gallery**: ProductImageGallery component with arrow navigation, thumbnails, and image counters
- **Enhanced Product Display**: All product cards now feature rich image galleries with mobile-optimized controls

### Comprehensive User Registration & Profile System
- **Full Email Signup**: Implemented complete user registration with email, first name, last name, phone number, full address (street, city, state, ZIP), country, and date of birth
- **Profile Management**: Created sophisticated profile page allowing users to update personal information, set preferences, and view personalized recommendations
- **Address Integration**: Checkout process automatically uses saved address information from user profiles

### Advanced Recommendation Engine
- **Multiple Algorithms**: Implemented collaborative filtering, content-based filtering, trending products, and seasonal recommendations
- **User Context Memory**: System tracks browsing behavior, purchase history, preferences, and interactions to personalize recommendations
- **Smart Learning**: AI learns from user chat interactions, product views, and purchase patterns to improve suggestions over time
- **External Algorithm Integration**: Modular recommendation system supports easy integration of additional recommendation algorithms

### Enhanced Database Schema
- **User Context Table**: Stores user behavior, preferences, and interaction history with weighted importance
- **Recommendations Table**: Tracks AI-generated product suggestions with scores, reasons, and algorithm sources
- **Expanded User Profiles**: Full contact information, preferences, and profile completion tracking

### Context-Aware Features
- **Chat Integration**: User conversations inform recommendation algorithms and preference learning
- **Behavioral Tracking**: System monitors product interest signals from chat messages and browsing patterns
- **Personalized Experience**: Each user gets tailored product suggestions based on their complete interaction history