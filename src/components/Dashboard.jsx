import Sidebar from './Sidebar';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Your Sidebar component goes on the left */}
      <Sidebar />
      
      {/* The main dashboard content goes on the right */}
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to CreatorIQ</h1>
        <p className="mt-4 text-gray-600">You are securely logged in and viewing protected data!</p>
        
        <button 
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload(); // Quick way to log out for now
          }}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}