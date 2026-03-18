// components/NotificationManagement.tsx
'use client';

import { useState } from 'react';

interface Notification {
  id: number;
  title: string;
  content: string;
}

export default function NotificationPage() {
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Table state
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: '[PREUS]Service offline due to a global budget at upstream datacenter', content: 'All servers are currently running.' },
    { id: 2, title: 'abhl', content: 'sbh' },
    { id: 3, title: 'cxbgr', content: 'xvld' },
    { id: 4, title: 'dgfvi', content: 'v' },
    { id: 5, title: 'hcfa', content: 'tfb in demo notification' },
    { id: 6, title: 'hcfa there', content: 'goal to see you' },
    { id: 7, title: 'hotday', content: 'tomorrow is off day' },
    { id: 8, title: 'new modification', content: 'equipment' },
    { id: 9, title: 'Service offline due to a global budget at upstream datacenter', content: 'We are experiencing network issues from one of our upstream providers, causing some service disruptions, working.' },
    { id: 10, title: 'SYSTEM MAINTENANCE', content: 'app.smpromass.com will be unavailable/under MAINTENANCE from 03.00 pm to 06.30 pm on 28 May 2021.' },
  ]);
  
  // Pagination state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [andOrChecked, setAndOrChecked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      const newNotification: Notification = {
        id: notifications.length + 1,
        title: title.trim(),
        content: content.trim()
      };
      setNotifications([...notifications, newNotification]);
      setTitle('');
      setContent('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Notification Management</h1>
        
        {/* Add New Notification Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Notification</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Notification Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Title*
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Notification Title"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Notification Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Content*
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter Notification Content"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
              >
                Add Notification
              </button>
            </div>
          </form>
        </div>

        {/* Notifications Table Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show</span>
                <select 
                  value={entriesPerPage}
                  onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={andOrChecked}
                onChange={(e) => setAndOrChecked(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-600">and/or</span>
            </div>
          </div>

          {/* Notifications Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications
                  .slice(0, entriesPerPage)
                  .map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900 max-w-md">
                          {notification.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-gray-600 max-w-lg">
                          {notification.content}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-medium">1</span> to{' '}
              <span className="font-medium">
                {Math.min(entriesPerPage, notifications.length)}
              </span> of{' '}
              <span className="font-medium">{notifications.length}</span> entries
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={true}
              >
                Previous
              </button>
              <button 
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={true}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}