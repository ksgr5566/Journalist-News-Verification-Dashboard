# Journalist News Verification Dashboard - Setup Guide

This is a Reddit-like application for journalists to share, verify, and discuss news stories. Built with React, TypeScript, Vite, and Supabase.

## Features

- 🔐 Google OAuth authentication
- 📝 Create and share news posts with images
- 🗳️ Vote on news credibility (True/Neutral/Fake)
- 💬 Comment and discuss posts
- 🏆 Reputation system for users
- 🏷️ Topic-based categorization
- 🔍 Search and filter functionality
- 📊 Color-coded post backgrounds based on votes

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to Settings > API
3. Copy your Project URL and anon key
4. Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Set up the Database

1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `database-schema.sql` into the editor
3. Run the SQL script to create all tables, functions, and sample data

### 4. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Google OAuth
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:3000` (for development)
4. Copy the Client ID and Client Secret to Supabase

### 5. Set up Storage (for images)

1. In your Supabase dashboard, go to Storage
2. Create a new bucket called `images`
3. Set the bucket to public
4. Configure RLS policies for the bucket

### 6. Run the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Database Schema

The application uses the following main tables:

- **users**: User profiles and reputation
- **topics**: News categories
- **posts**: News stories with voting data
- **comments**: Discussion threads
- **votes**: User votes on posts

## Key Features Explained

### Voting System
- Users can vote posts as "True", "Neutral", or "Fake"
- Post backgrounds change color based on vote ratios:
  - Red: Mostly fake votes
  - Green: Mostly true votes
  - Yellow: Mixed or neutral votes

### Reputation System
- Users earn reputation points for:
  - Creating posts (+10 points)
  - Receiving votes on their posts (+1 per vote)
- Reputation levels:
  - Newcomer: 0-49 points
  - Contributor: 50-99 points
  - Experienced: 100-499 points
  - Veteran: 500-999 points
  - Expert: 1000+ points

### Topic System
- Posts are categorized by topics
- Topics have colors for visual identification
- Users can filter posts by topic

## Sample Data

The database comes pre-populated with:
- 5 sample users with different reputation levels
- 8 news topics (Politics, Technology, Health, etc.)
- 8 sample posts with realistic content
- Sample votes and comments

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── lib/               # Utilities and Supabase config
├── pages/             # Main application pages
└── styles/            # Global styles
```

### Key Components

- `AuthContext`: Handles authentication state
- `PostCard`: Displays individual posts
- `SearchFilters`: Search and filter functionality
- `Sidebar`: Navigation and user info

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set environment variables
3. Deploy

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Common Issues

1. **Authentication not working**: Check Google OAuth configuration
2. **Images not uploading**: Verify Supabase storage bucket setup
3. **Database errors**: Ensure all SQL scripts ran successfully
4. **CORS issues**: Check Supabase project settings

### Getting Help

- Check the Supabase documentation
- Review the React Router documentation
- Check the Radix UI component documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
