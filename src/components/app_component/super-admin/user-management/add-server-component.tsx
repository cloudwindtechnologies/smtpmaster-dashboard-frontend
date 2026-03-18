"use client";

import React, { useState, useMemo } from "react";
import { Search, Edit, Trash2 } from "lucide-react";

type Server = {
  id: string;
  serverName: string;
  serverIp: string;
};

const demoServers: Server[] = [
  { id: "1", serverName: "way2smtp.way2inboxes.com", serverIp: "167.114.185.35" },
];

const pageSizeOptions = [10, 25, 50, 100];

function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (p: number) => void }) {
  const items = [];
  const maxFront = Math.min(5, pageCount);

  for (let i = 1; i <= maxFront; i++) items.push(i);
  if (pageCount > 6) items.push("...");
  if (pageCount > 5) items.push(pageCount);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Previous
      </button>
      <div className="flex items-center gap-2">
        {items.map((item, idx) =>
          item === "..." ? (
            <span key={`dots-${idx}`} className="text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item as number)}
              className={`h-9 w-9 rounded border ${item === page ? "border-gray-500 bg-gray-100 font-semibold" : "border-gray-300 bg-white hover:bg-gray-50"}`}
            >
              {item}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="text-gray-700 hover:text-gray-900 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export default function AddServerPage() {
  const [serverName, setServerName] = useState("");
  const [serverIp, setServerIp] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const filteredServers = demoServers; // Replace this with filtering logic if needed
  const pageCount = Math.ceil(filteredServers.length / pageSize);
  const pagedServers = filteredServers.slice((page - 1) * pageSize, page * pageSize);

  const handleAddServer = () => {
    // Logic to add a server goes here (e.g., API call)
    console.log({ serverName, serverIp });
    alert("Server added (demo). Connect API to store.");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Add Server Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Add Server</h1>
          </div>
          <div className="p-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Server Name *</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="mt-2 p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-800">Server IP *</label>
                  <input
                    type="text"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                    className="mt-2 p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddServer}
                className="mt-6 inline-flex items-center justify-center px-6 py-3 text-white font-semibold bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Server List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Server List</h1>
          </div>

          {/* Search & Show Controls */}
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-lg font-semibold">entries</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-lg font-semibold">Search:</label>
              <input
                type="text"
                className="px-3 py-2 rounded border"
                placeholder="Search"
              />
              <Search className="h-5 w-5 text-gray-500" />
            </div>
          </div>

          {/* Servers Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">SL</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Server Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Server IP</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedServers.map((server, index) => (
                  <tr key={server.id} className="border-b">
                    <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{server.serverName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{server.serverIp}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-500 hover:text-blue-700 mr-3">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4">
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
