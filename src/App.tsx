import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Sidebar } from "./components/Sidebar"
import { HomePage } from "./pages/HomePage"
import { PostPage } from "./pages/PostPage"
import { ArticlePage } from "./pages/ArticlePage"
import { CreatePostPage } from "./pages/CreatePostPage"
import { ProfilePage } from "./pages/ProfilePage"
import { LoginPage } from "./pages/LoginPage"

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="h-screen flex bg-gray-50">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/article/:id" element={<ArticlePage />} />
              <Route path="/create" element={<CreatePostPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}