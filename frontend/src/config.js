// Global API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? ''  // Production mein khali rakhein kyunke backend khud /api handle karta hai
  : 'http://localhost:5000';

export default API_BASE_URL;